"use client";

import { useEffect, useState } from "react";
import type { CurrentQuestion } from "@/lib/types";

const OPTION_STYLES = [
  { idle: "border-indigo-600 bg-indigo-950/50 hover:bg-indigo-800/50 hover:border-indigo-400 text-indigo-100", letter: "bg-indigo-600", selected: "border-indigo-300 bg-indigo-800/60 text-white" },
  { idle: "border-rose-600 bg-rose-950/50 hover:bg-rose-800/50 hover:border-rose-400 text-rose-100", letter: "bg-rose-600", selected: "border-rose-300 bg-rose-800/60 text-white" },
  { idle: "border-amber-500 bg-amber-950/50 hover:bg-amber-800/50 hover:border-amber-400 text-amber-100", letter: "bg-amber-500", selected: "border-amber-300 bg-amber-800/60 text-white" },
  { idle: "border-teal-600 bg-teal-950/50 hover:bg-teal-800/50 hover:border-teal-400 text-teal-100", letter: "bg-teal-600", selected: "border-teal-300 bg-teal-800/60 text-white" },
];

interface Props {
  currentQuestion: CurrentQuestion;
  playerId: string | null;
  onAnswer: (index: number) => void;
  lastCorrect?: boolean | null;
  pointsRewarded?: number;
  correctAnswer?: number | null;
}

export function QuestionCard({ currentQuestion, playerId, onAnswer, lastCorrect, pointsRewarded, correctAnswer }: Props) {
  const { question, startTime, endTime } = currentQuestion;
  const total = endTime - startTime;
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, endTime - Math.floor(Date.now() / 1000)));
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const hasAnswered = playerId ? currentQuestion.answered[playerId] === true : false;
  const resultKnown = lastCorrect !== null && lastCorrect !== undefined;

  useEffect(() => { setSelectedIdx(null); }, [question.id]);

  useEffect(() => {
    const tick = () => setTimeLeft(Math.max(0, endTime - Math.floor(Date.now() / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endTime]);

  const handleAnswer = (idx: number) => {
    if (hasAnswered || selectedIdx !== null || timeLeft === 0) return;
    setSelectedIdx(idx);
    onAnswer(idx);
  };

  const pct = total > 0 ? (timeLeft / total) * 100 : 0;
  const barColor = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
  const cardBorder = resultKnown
    ? lastCorrect ? "border-emerald-500/60 bg-emerald-950/20" : "border-red-500/60 bg-red-950/20"
    : "border-purple-700/40 bg-zinc-900/60";

  return (
    <div className={`relative rounded-2xl border p-5 space-y-4 overflow-hidden backdrop-blur-sm transition-colors duration-500 ${cardBorder}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="rounded-full bg-violet-800/50 border border-violet-600/40 px-3 py-0.5 text-violet-200 font-medium">
          {question.category}
        </span>
        <span className={`font-mono font-bold text-sm ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-zinc-400"}`}>
          {timeLeft}s
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-base font-semibold leading-snug text-zinc-100">{question.text}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((option, idx) => {
          const style = OPTION_STYLES[idx % OPTION_STYLES.length];
          const isSelected = selectedIdx === idx;
          const isCorrect = resultKnown && correctAnswer != null && idx === correctAnswer;
          const isDimmed = resultKnown
            ? !isSelected && !isCorrect
            : (hasAnswered || selectedIdx !== null) && !isSelected;

          let btnClass = "";
          if (resultKnown && isCorrect && isSelected) {
            // user picked the correct answer
            btnClass = "border-emerald-400 bg-emerald-800/50 text-emerald-100";
          } else if (resultKnown && isCorrect) {
            // correct answer the user didn't pick
            btnClass = "border-emerald-400 bg-emerald-800/50 text-emerald-100";
          } else if (resultKnown && isSelected) {
            // user's wrong answer
            btnClass = "border-red-400 bg-red-800/50 text-red-100 animate-shake";
          } else if (isDimmed) {
            btnClass = "border-zinc-700/40 bg-zinc-800/20 text-zinc-600 cursor-default";
          } else if (isSelected) {
            btnClass = `${style.selected} cursor-default`;
          } else {
            btnClass = `${style.idle} cursor-pointer`;
          }

          const letterClass = resultKnown && (isCorrect || isSelected)
            ? isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            : isDimmed ? "bg-zinc-700 text-zinc-500"
            : `${style.letter} text-white`;

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={hasAnswered || timeLeft === 0}
              className={`rounded-xl border px-4 py-3 text-sm text-left flex items-center gap-2.5 transition-all duration-200 ${btnClass}`}
            >
              <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${letterClass}`}>
                {String.fromCharCode(65 + idx)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {hasAnswered && !resultKnown && (
        <p className="text-center text-sm text-zinc-400 py-1">Answer locked in — waiting for others…</p>
      )}

      {resultKnown && (
        <div className={`rounded-xl py-4 px-4 text-center animate-pop-in ${lastCorrect ? "bg-emerald-900/50 border border-emerald-700/50" : "bg-red-900/50 border border-red-700/50"}`}>
          <p className="text-4xl leading-none">{lastCorrect ? "🎉" : "😬"}</p>
          <p className={`text-xl font-black mt-2 ${lastCorrect ? "text-emerald-300" : "text-red-300"}`}>
            {lastCorrect ? "Correct!" : "Wrong!"}
          </p>
          {lastCorrect && pointsRewarded != null && (
            <p className="text-emerald-400 font-semibold text-sm mt-0.5">+{pointsRewarded} points</p>
          )}
        </div>
      )}

      {resultKnown && lastCorrect && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          {["⭐", "✨", "🌟", "✨", "⭐"].map((e, i) => (
            <span
              key={i}
              className="absolute text-xl animate-float-up"
              style={{ left: `${10 + i * 18}%`, bottom: "30%", animationDelay: `${i * 0.1}s` }}
            >
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

