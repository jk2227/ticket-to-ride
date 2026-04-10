"use client";

import { ClientGameState } from "@/game/types";

const PLAYER_COLOR_MAP: Record<string, string> = {
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#ca8a04",
};

interface ScoreBoardProps {
  gameState: ClientGameState;
  playerId: string;
}

export function ScoreBoard({ gameState, playerId }: ScoreBoardProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="scoreboard">
      <div className="turn-indicator">
        {gameState.phase === "choosing-destinations" ? (
          <span>Choosing destinations...</span>
        ) : (
          <span>
            {currentPlayer?.id === playerId
              ? "Your turn!"
              : `${currentPlayer?.name}'s turn`}
          </span>
        )}
      </div>

      <div className="player-scores">
        {gameState.players.map((player, i) => (
          <div
            key={player.id}
            className={`score-row ${
              i === gameState.currentPlayerIndex && gameState.phase === "playing"
                ? "active"
                : ""
            } ${player.id === playerId ? "you" : ""}`}
          >
            <span
              className="score-dot"
              style={{ background: PLAYER_COLOR_MAP[player.color] }}
            />
            <span className="score-name">
              {player.name}
              {player.id === playerId ? " (You)" : ""}
            </span>
            <span className="score-info">
              <span title="Cards in hand">{player.handCount} cards</span>
              {" | "}
              <span title="Taxi cabs remaining">{player.taxiCabs} taxis</span>
              {" | "}
              <span title="Destination tickets">{player.destinationTicketCount} dest</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
