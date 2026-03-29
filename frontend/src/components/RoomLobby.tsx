interface Props {
  joinCode: string;
  playerCount: number;
}

export function RoomLobby({ joinCode, playerCount }: Props) {
  return (
    <div className="rounded-2xl border border-purple-700/40 bg-gradient-to-br from-indigo-950/80 to-purple-950/80 p-6 text-center space-y-4">
      <p className="text-sm text-zinc-300 font-medium">Share this code to invite friends</p>
      <div className="inline-block rounded-2xl bg-zinc-900/80 border border-violet-500/50 px-10 py-5 shadow-lg shadow-violet-900/20">
        <span className="font-mono text-4xl font-black tracking-widest bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
          {joinCode}
        </span>
      </div>
      <p className="text-xs text-zinc-400">
        {playerCount} player{playerCount !== 1 ? "s" : ""} connected
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-zinc-300">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        Waiting for the game to start…
      </div>
    </div>
  );
}
