"use client";

import { ClientGameState } from "@/game/types";
import { useEffect, useState } from "react";

const PLAYER_COLOR_MAP: Record<string, string> = {
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#ca8a04",
};

function formatLocationName(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface GameOverProps {
  gameState: ClientGameState;
  playerId: string;
}

export function GameOver({ gameState, playerId }: GameOverProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const winner = gameState.players.find((p) => p.id === gameState.winner);
  const isWinner = gameState.winner === playerId;
  const scores = gameState.scores;

  // Sort players by score
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    const scoreA = scores?.[a.id]?.totalScore || 0;
    const scoreB = scores?.[b.id]?.totalScore || 0;
    return scoreB - scoreA;
  });

  return (
    <div className="game-over">
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#ec4899", "#8b5cf6"][
                  Math.floor(Math.random() * 6)
                ],
              }}
            />
          ))}
        </div>
      )}

      <div className="game-over-card">
        <h1>{isWinner ? "You Win!" : `${winner?.name} Wins!`}</h1>
        <p className="winner-score">
          {scores?.[gameState.winner || ""]?.totalScore || 0} points
        </p>

        <div className="final-scores">
          {sortedPlayers.map((player, rank) => {
            const score = scores?.[player.id];
            if (!score) return null;

            return (
              <div key={player.id} className="final-score-row">
                <div className="rank">#{rank + 1}</div>
                <div className="final-player-info">
                  <div className="final-player-name">
                    <span
                      className="score-dot"
                      style={{ background: PLAYER_COLOR_MAP[player.color] }}
                    />
                    {player.name}
                    {player.id === playerId ? " (You)" : ""}
                  </div>
                  <div className="score-breakdown">
                    <span>Routes: {score.routePoints}</span>
                    <span>
                      Destinations: {score.destinationPoints >= 0 ? "+" : ""}
                      {score.destinationPoints}
                    </span>
                    <strong>Total: {score.totalScore}</strong>
                  </div>
                  <div className="completed-destinations">
                    {score.completedDestinations.map(({ ticket, completed }) => (
                      <span
                        key={ticket.id}
                        className={`dest-result ${completed ? "completed" : "failed"}`}
                      >
                        {formatLocationName(ticket.from)} → {formatLocationName(ticket.to)}{" "}
                        ({completed ? "+" : "-"}{ticket.points})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="play-again-btn"
          onClick={() => (window.location.href = "/")}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
