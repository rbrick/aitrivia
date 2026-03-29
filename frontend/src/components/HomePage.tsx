"use client";

import { useState } from "react";
import { CreateRoomForm } from "./CreateRoomForm";
import { JoinRoomForm } from "./JoinRoomForm";

type Tab = "create" | "join";

export function HomePage() {
  const [tab, setTab] = useState<Tab>("join");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-900 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
            AI Trivia
          </h1>
          <p className="text-zinc-400 text-sm">AI-powered trivia for everyone</p>
        </div>

        <div className="flex rounded-xl bg-zinc-900/60 border border-zinc-700/40 p-1">
          {(["join", "create"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all capitalize ${
                tab === t
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t === "join" ? "Join Room" : "Create Room"}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-700/40 bg-zinc-900/60 backdrop-blur-sm p-5">
          {tab === "join" ? <JoinRoomForm /> : <CreateRoomForm />}
        </div>
      </div>
    </div>
  );
}
