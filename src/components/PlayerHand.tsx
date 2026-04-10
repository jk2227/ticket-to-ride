"use client";

import { Player, Card } from "@/game/types";

const CARD_COLORS: Record<Card, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  orange: "#f97316",
  pink: "#ec4899",
  red: "#ef4444",
  black: "#374151",
  white: "#e5e7eb",
  yellow: "#eab308",
  wild: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6, #3b82f6)",
};

const CARD_TEXT_COLOR: Record<Card, string> = {
  blue: "#fff",
  green: "#fff",
  orange: "#fff",
  pink: "#fff",
  red: "#fff",
  black: "#fff",
  white: "#333",
  yellow: "#333",
  wild: "#fff",
};

interface PlayerHandProps {
  player: Player;
}

export function PlayerHand({ player }: PlayerHandProps) {
  // Group cards by type
  const cardCounts: Record<string, number> = {};
  for (const card of player.hand) {
    cardCounts[card] = (cardCounts[card] || 0) + 1;
  }

  const cardOrder: Card[] = [
    "red", "orange", "yellow", "green", "blue", "pink", "white", "black", "wild",
  ];

  return (
    <div className="player-hand">
      <h3>Your Hand ({player.hand.length} cards)</h3>
      <div className="hand-cards">
        {cardOrder.map((card) => {
          const count = cardCounts[card];
          if (!count) return null;
          return (
            <div
              key={card}
              className="hand-card"
              style={{
                background: CARD_COLORS[card],
                color: CARD_TEXT_COLOR[card],
              }}
            >
              <span className="card-count">{count}</span>
              <span className="card-label">{card === "wild" ? "Wild" : card}</span>
            </div>
          );
        })}
      </div>

      {player.destinationTickets.length > 0 && (
        <div className="destination-tickets">
          <h4>Destinations</h4>
          <div className="ticket-list">
            {player.destinationTickets.map((ticket) => (
              <div key={ticket.id} className="ticket">
                <span className="ticket-route">
                  {formatLocationName(ticket.from)} → {formatLocationName(ticket.to)}
                </span>
                <span className="ticket-points">{ticket.points}pt</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatLocationName(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
