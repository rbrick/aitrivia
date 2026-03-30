"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameSocket } from "@/hooks/useGameSocket";
import { RoomLobby } from "@/components/RoomLobby";
import { QuestionCard } from "@/components/QuestionCard";
import { PlayerList } from "@/components/PlayerList";
import { GameOver } from "@/components/GameOver";
import { ChatBox } from "@/components/ChatBox";

interface Props {
  params: Promise<{ joinCode: string }>;
}

export default function RoomPage({ params }: Props) {
  const { joinCode } = use(params);
  const searchParams = useSearchParams();
  const [playerName, setPlayerName] = useState(searchParams.get("name") ?? "");
  const [pendingName, setPendingName] = useState("");

  const router = useRouter();
  const { phase, room, playerId, lastResult, errorMessage, chatMessages, submitAnswer, sendChat, startGame } = useGameSocket(
    joinCode,
    playerName
  );

  if (!playerName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-900 text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Join Room</h1>
            <p className="text-sm text-zinc-400">
              Enter your name to join <span className="font-mono text-zinc-300">{joinCode}</span>
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = pendingName.trim();
              if (trimmed) setPlayerName(trimmed);
            }}
            className="space-y-3"
          >
            <input
              autoFocus
              type="text"
              placeholder="Your name"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              maxLength={32}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!pendingName.trim()}
              className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-300">
              {room.players.length} player{room.players.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => router.push("/")}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              Leave
            </button>
          </div>
        </header>

        {phase === "lobby" && (
          <RoomLobby
            joinCode={joinCode}
            playerCount={room.players.length}
            isHost={room.hostId === playerId}
            onStart={startGame}
          />
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

        {phase !== "finished" && (
          <ChatBox messages={chatMessages} currentPlayerId={playerId} onSend={sendChat} />
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
