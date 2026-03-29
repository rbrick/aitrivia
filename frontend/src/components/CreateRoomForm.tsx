"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

const PRESET_CATEGORIES = ["Science", "History", "Geography", "Sports", "Music", "Movies", "Technology", "Nature", "U.S. Presidents", "Solar System", "Astronomy"];

export function CreateRoomForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState("");
  const [answerTime, setAnswerTime] = useState(20);
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const addCustom = () => {
    const trimmed = customCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }
    setCustomCategory("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return setError("Enter your name");
    if (categories.length === 0) return setError("Pick at least one category");
    setError("");
    setLoading(true);
    try {
      const { room } = await api.createRoom({ categories, answerTime });
      router.push(`/room/${room.joinCode}?name=${encodeURIComponent(playerName.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">Your name</label>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="e.g. Alex"
          maxLength={32}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Categories</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categories.includes(cat)
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            placeholder="Custom category…"
            maxLength={48}
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded-lg bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600 transition-colors"
          >
            Add
          </button>
        </div>
        {categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {categories.map((cat) => (
              <span
                key={cat}
                className="flex items-center gap-1 rounded-full bg-violet-900/50 px-2 py-0.5 text-xs text-violet-300"
              >
                {cat}
                <button type="button" onClick={() => toggleCategory(cat)} className="hover:text-white">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Answer time: <span className="text-violet-400">{answerTime}s</span>
        </label>
        <input
          type="range"
          min={10}
          max={60}
          step={5}
          value={answerTime}
          onChange={(e) => setAnswerTime(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create Room"}
      </button>
    </form>
  );
}
