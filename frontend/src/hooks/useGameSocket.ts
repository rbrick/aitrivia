"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "@/lib/api";
import type { AnswerResult, Room, ServerMessage } from "@/lib/types";

export type GamePhase = "connecting" | "lobby" | "playing" | "finished" | "error";

export interface GameState {
  phase: GamePhase;
  room: Room | null;
  playerId: string | null;
  lastResult: AnswerResult | null;
  errorMessage: string | null;
  submitAnswer: (index: number) => void;
}

export function useGameSocket(joinCode: string, playerName: string): GameState {
  const wsRef = useRef<WebSocket | null>(null);
  const [phase, setPhase] = useState<GamePhase>("connecting");
  const phaseRef = useRef<GamePhase>("connecting");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updatePhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    if (!joinCode || !playerName) return;

    const url = `${WS_URL}/ws?roomCode=${encodeURIComponent(joinCode)}&playerName=${encodeURIComponent(playerName)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);

      if (msg.type === "error") {
        updatePhase("error");
        setErrorMessage(msg.error ?? "Unknown error");
        return;
      }

      if (msg.room) setRoom(msg.room);

      if (msg.type === "session_ready") {
        setPlayerId(msg.playerId ?? null);
        updatePhase(msg.room?.currentQuestion ? "playing" : "lobby");
      }

      if (msg.type === "room_state") {
        const hasQuestion = !!msg.room?.currentQuestion;
        const wasPlaying = phaseRef.current === "playing";
        if (!hasQuestion && wasPlaying) {
          updatePhase("finished");
        } else {
          updatePhase(hasQuestion ? "playing" : "lobby");
        }
        // Preserve lastResult when the same question is still active (e.g. another player answered).
        // Only clear it when the question changes or ends.
        const incomingQuestionId = msg.room?.currentQuestion?.question.id ?? null;
        setLastResult(prev => {
          if (prev === null) return null;
          const prevQuestionId = prev.room?.currentQuestion?.question.id ?? null;
          return prevQuestionId === incomingQuestionId ? prev : null;
        });
      }

      if (msg.type === "answer_result" && msg.room) {
        setLastResult({
          room: msg.room,
          pointsRewarded: msg.pointsRewarded ?? 0,
          correct: msg.correct ?? false,
          correctAnswer: msg.correctAnswer ?? 0,
        });
        updatePhase(msg.room.currentQuestion ? "playing" : "finished");
      }
    };

    ws.onerror = () => {
      updatePhase("error");
      setErrorMessage("Connection failed");
    };

    ws.onclose = () => {
      if (phaseRef.current !== "error") updatePhase("finished");
    };

    return () => ws.close();
  }, [joinCode, playerName, updatePhase]);

  const submitAnswer = useCallback((index: number) => {
    wsRef.current?.send(JSON.stringify({ type: "submit_answer", answer: index }));
  }, []);

  return { phase, room, playerId, lastResult, errorMessage, submitAnswer };
}
