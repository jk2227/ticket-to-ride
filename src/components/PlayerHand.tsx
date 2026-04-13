"use client";

import { Player, Card, Route, DestinationTicket } from "@/game/types";

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

function isDestinationCompleted(
  ticket: DestinationTicket,
  routes: Route[],
  playerId: string
): boolean {
  const playerRoutes = routes.filter((r) => r.claimedBy === playerId);
  const adjacency: Record<string, string[]> = {};

  for (const route of playerRoutes) {
    if (!adjacency[route.from]) adjacency[route.from] = [];
    if (!adjacency[route.to]) adjacency[route.to] = [];
    adjacency[route.from].push(route.to);
    adjacency[route.to].push(route.from);
  }

  const visited = new Set<string>();
  const queue = [ticket.from];
  visited.add(ticket.from);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === ticket.to) return true;
    for (const neighbor of adjacency[current] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

interface PlayerHandProps {
  player: Player;
  routes: Route[];
}

export function PlayerHand({ player, routes }: PlayerHandProps) {
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
            {player.destinationTickets.map((ticket) => {
              const completed = isDestinationCompleted(ticket, routes, player.id);
              return (
                <div key={ticket.id} className={`ticket ${completed ? "completed" : ""}`}>
                  <span className="ticket-route-label">
                    {completed && <span className="ticket-check">&#10003;</span>}
                    <span className="ticket-route">
                      {formatLocationName(ticket.from)} → {formatLocationName(ticket.to)}
                    </span>
                  </span>
                  <span className="ticket-points">{ticket.points}pt</span>
                </div>
              );
            })}
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
