"use client";

import { useState } from "react";
import { ClientGameState, Card, Route } from "@/game/types";
import { newYorkVariant } from "@/game/variants/new-york";

const ROUTE_COLOR_MAP: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  orange: "#f97316",
  pink: "#ec4899",
  red: "#ef4444",
  black: "#374151",
  white: "#e5e7eb",
  yellow: "#eab308",
  wild: "#8b5cf6",
};

const PLAYER_COLOR_MAP: Record<string, string> = {
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#ca8a04",
};

interface BoardProps {
  gameState: ClientGameState;
  playerId: string;
  onClaimRoute?: (routeId: number, cards: Card[]) => void;
}

export function Board({ gameState, playerId, onClaimRoute }: BoardProps) {
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const locations = newYorkVariant.locations;

  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]));
  const myPlayer = gameState.myPlayer;

  const handleRouteClick = (route: Route) => {
    if (!onClaimRoute || route.claimedBy) return;
    if (!myPlayer) return;

    if (selectedRoute === route.id) {
      // Deselect
      setSelectedRoute(null);
      setSelectedCards([]);
      return;
    }

    setSelectedRoute(route.id);
    setSelectedCards([]);
  };

  const autoSelectCards = (route: Route): Card[] | null => {
    if (!myPlayer) return null;
    const hand = [...myPlayer.hand];
    const needed = route.length;

    if (route.color === "wild") {
      // Any single color + wilds
      const colorCounts: Record<string, number> = {};
      let wildCount = 0;
      for (const card of hand) {
        if (card === "wild") wildCount++;
        else colorCounts[card] = (colorCounts[card] || 0) + 1;
      }
      // Try each color
      for (const [color, count] of Object.entries(colorCounts)) {
        if (count + wildCount >= needed) {
          const cards: Card[] = [];
          const colorNeeded = Math.min(count, needed);
          for (let i = 0; i < colorNeeded; i++) cards.push(color as Card);
          for (let i = 0; i < needed - colorNeeded; i++) cards.push("wild");
          return cards;
        }
      }
      // All wilds
      if (wildCount >= needed) {
        return Array(needed).fill("wild");
      }
      return null;
    }

    // Specific color route
    const colorCount = hand.filter((c) => c === route.color).length;
    const wildCount = hand.filter((c) => c === "wild").length;
    if (colorCount + wildCount < needed) return null;

    const cards: Card[] = [];
    const colorNeeded = Math.min(colorCount, needed);
    for (let i = 0; i < colorNeeded; i++) cards.push(route.color);
    for (let i = 0; i < needed - colorNeeded; i++) cards.push("wild");
    return cards;
  };

  const confirmClaim = () => {
    if (selectedRoute === null || !onClaimRoute) return;
    const route = gameState.routes.find((r) => r.id === selectedRoute);
    if (!route) return;

    const cards = autoSelectCards(route);
    if (!cards) return;
    onClaimRoute(route.id, cards);
    setSelectedRoute(null);
    setSelectedCards([]);
  };

  const canClaim = (route: Route): boolean => {
    if (!myPlayer || route.claimedBy) return false;
    if (myPlayer.taxiCabs < route.length) return false;
    return autoSelectCards(route) !== null;
  };

  // Compute route midpoint and offset for label
  const getRoutePath = (route: Route) => {
    const from = locationMap[route.from];
    const to = locationMap[route.to];
    if (!from || !to) return null;
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  };

  const getRouteSegments = (route: Route) => {
    const path = getRoutePath(route);
    if (!path) return [];

    const { x1, y1, x2, y2 } = path;
    const segments = [];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const segLen = 24;
    const gap = 4;
    const totalSegLen = route.length * segLen + (route.length - 1) * gap;
    const startOffset = (len - totalSegLen) / 2;

    // Normal vector for width
    const nx = -dy / len;
    const ny = dx / len;
    const halfWidth = 6;

    for (let i = 0; i < route.length; i++) {
      const t1 = (startOffset + i * (segLen + gap)) / len;
      const t2 = (startOffset + i * (segLen + gap) + segLen) / len;

      const cx = x1 + dx * ((t1 + t2) / 2);
      const cy = y1 + dy * ((t1 + t2) / 2);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      segments.push({ cx, cy, angle, width: segLen, height: halfWidth * 2 });
    }
    return segments;
  };

  const selectedRouteObj = selectedRoute !== null
    ? gameState.routes.find((r) => r.id === selectedRoute)
    : null;

  return (
    <div className="board">
      <svg viewBox="0 0 800 720" className="board-svg">
        {/* Background */}
        <rect width="800" height="720" fill="#1a1a2e" rx="12" />

        {/* Routes */}
        {gameState.routes.map((route) => {
          const path = getRoutePath(route);
          if (!path) return null;
          const segments = getRouteSegments(route);
          const isSelected = selectedRoute === route.id;
          const isClaimed = route.claimedBy !== null;
          const claimable = onClaimRoute && canClaim(route);

          const claimerPlayer = isClaimed
            ? gameState.players.find((p) => p.id === route.claimedBy)
            : null;

          return (
            <g
              key={route.id}
              onClick={() => handleRouteClick(route)}
              style={{ cursor: claimable ? "pointer" : "default" }}
            >
              {/* Route line (background) */}
              <line
                x1={path.x1}
                y1={path.y1}
                x2={path.x2}
                y2={path.y2}
                stroke={
                  isSelected
                    ? "#fbbf24"
                    : ROUTE_COLOR_MAP[route.color] || "#666"
                }
                strokeWidth={isSelected ? 4 : 2}
                opacity={0.3}
              />

              {/* Segments */}
              {segments.map((seg, i) => (
                <rect
                  key={i}
                  x={seg.cx - seg.width / 2}
                  y={seg.cy - seg.height / 2}
                  width={seg.width}
                  height={seg.height}
                  rx={3}
                  transform={`rotate(${seg.angle}, ${seg.cx}, ${seg.cy})`}
                  fill={
                    isClaimed && claimerPlayer
                      ? PLAYER_COLOR_MAP[claimerPlayer.color]
                      : "transparent"
                  }
                  stroke={
                    isSelected
                      ? "#fbbf24"
                      : ROUTE_COLOR_MAP[route.color] || "#666"
                  }
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={isClaimed ? 0.9 : claimable ? 0.8 : 0.4}
                />
              ))}
            </g>
          );
        })}

        {/* Locations */}
        {locations.map((loc) => (
          <g key={loc.id}>
            <circle
              cx={loc.x}
              cy={loc.y}
              r={14}
              fill="#16213e"
              stroke="#e2e8f0"
              strokeWidth={2}
            />
            <text
              x={loc.x}
              y={loc.y - 20}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize={11}
              fontWeight={600}
            >
              {loc.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Route claim dialog */}
      {selectedRouteObj && onClaimRoute && canClaim(selectedRouteObj) && (
        <div className="claim-dialog">
          <p>
            Claim route: {locationMap[selectedRouteObj.from]?.name} →{" "}
            {locationMap[selectedRouteObj.to]?.name} ({selectedRouteObj.length}{" "}
            cards)
          </p>
          <div className="claim-actions">
            <button onClick={confirmClaim} className="claim-btn">
              Claim Route
            </button>
            <button
              onClick={() => setSelectedRoute(null)}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
