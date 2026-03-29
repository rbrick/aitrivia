import type { Player } from "@/lib/types";
import { PlayerList } from "./PlayerList";

interface Props {
  players: Player[];
  currentPlayerId: string | null;
  joinCode: string;
}

export function GameOver({ players, currentPlayerId, joinCode }: Props) {
  const sorted = [...players].sort((a, b) => b.points - a.points);
  const winner = sorted[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/60 to-purple-950/80 p-6 text-center space-y-3">
        <p className="text-5xl">🎊</p>
        <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Game Over</p>
        {winner && (
          <>
            <p className="text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              🏆 {winner.name}
            </p>
            <p className="text-zinc-300 text-sm">{winner.points} points</p>
          </>
        )}
        <p className="text-xs text-zinc-600 pt-1">Room {joinCode}</p>
      </div>
      <PlayerList players={players} currentPlayerId={currentPlayerId} />
    </div>
  );
}
