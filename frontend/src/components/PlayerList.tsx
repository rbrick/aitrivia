import type { Player } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = ["text-amber-300", "text-zinc-300", "text-amber-600"];

interface Props {
  players: Player[];
  currentPlayerId: string | null;
}

export function PlayerList({ players, currentPlayerId }: Props) {
  const sorted = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-700/50 text-xs font-bold uppercase tracking-widest text-zinc-400">
        Scoreboard
      </div>
      <ul className="divide-y divide-zinc-800/50">
        {sorted.map((player, idx) => (
          <li
            key={player.id}
            className={`flex items-center justify-between px-4 py-2.5 text-sm ${
              player.id === currentPlayerId ? "bg-violet-900/20" : ""
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 text-center">
                {idx < 3 ? MEDALS[idx] : <span className="text-xs text-zinc-600">{idx + 1}</span>}
              </span>
              <span className={player.id === currentPlayerId ? "font-bold text-violet-300" : (RANK_COLORS[idx] ?? "text-zinc-200")}>
                {player.name}
                {player.id === currentPlayerId && <span className="ml-1 text-xs text-zinc-500">(you)</span>}
              </span>
            </div>
            <span className={`font-mono text-xs font-semibold ${idx === 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {player.points} pts
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
