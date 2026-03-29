"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useGameSocket } from "@/hooks/useGameSocket";
import { RoomLobby } from "@/components/RoomLobby";
import { QuestionCard } from "@/components/QuestionCard";
import { PlayerList } from "@/components/PlayerList";
import { GameOver } from "@/components/GameOver";

interface Props {
  params: Promise<{ joinCode: string }>;
}

export default function RoomPage({ params }: Props) {
  const { joinCode } = use(params);
  const searchParams = useSearchParams();
  const playerName = searchParams.get("name") ?? "";

  const { phase, room, playerId, lastResult, errorMessage, submitAnswer } = useGameSocket(
    joinCode,
    playerName
  );

  if (phase === "error") {
    return <FullPageMessage title="Connection Error" body={errorMessage ?? "Something went wrong."} />;
  }

  if (phase === "connecting" || !room) {
    return <FullPageMessage title="Connecting…" body={`Joining room ${joinCode}`} spinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-900 text-zinc-100 p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">AI Trivia</h1>
            <p className="text-xs text-zinc-500">Room <span className="font-mono text-zinc-400">{joinCode}</span></p>
          </div>
          <span className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-300">
            {room.players.length} player{room.players.length !== 1 ? "s" : ""}
          </span>
        </header>

        {phase === "lobby" && (
          <RoomLobby joinCode={joinCode} playerCount={room.players.length} />
        )}

        {phase === "playing" && room.currentQuestion && (
          <QuestionCard
            currentQuestion={room.currentQuestion}
            playerId={playerId}
            onAnswer={submitAnswer}
            lastCorrect={lastResult?.correct ?? null}
            pointsRewarded={lastResult?.pointsRewarded}
            correctAnswer={lastResult?.correctAnswer ?? null}
          />
        )}

        {phase === "finished" && (
          <GameOver players={room.players} currentPlayerId={playerId} joinCode={joinCode} />
        )}

        {phase !== "finished" && (
          <PlayerList players={room.players} currentPlayerId={playerId} />
        )}


      </div>
    </div>
  );
}

function FullPageMessage({ title, body, spinner }: { title: string; body: string; spinner?: boolean }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-900 text-zinc-100 flex items-center justify-center">
      <div className="text-center space-y-2">
        {spinner && <div className="mx-auto h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />}
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm text-zinc-400">{body}</p>
      </div>
    </div>
  );
}
