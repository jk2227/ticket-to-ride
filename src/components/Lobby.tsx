"use client";

import { useState } from "react";
import { ClientGameState } from "@/game/types";

interface LobbyProps {
  gameState: ClientGameState;
  playerId: string;
  playerName: string | null;
  isInGame: boolean;
  onJoin: (name: string) => void;
  onReady: () => void;
  onStart: () => void;
  gameId: string;
}

export function Lobby({
  gameState,
  playerId,
  playerName,
  isInGame,
  onJoin,
  onReady,
  onStart,
  gameId,
}: LobbyProps) {
  const [name, setName] = useState(playerName || "");
  const [copied, setCopied] = useState(false);

  const isHost = playerId === gameState.hostId;
  const allReady = gameState.players.length >= 2 && gameState.players.every((p) => p.ready);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h1>Ticket to Ride</h1>
        <p className="subtitle">New York</p>

        <div className="share-section">
          <p>Share this link with friends:</p>
          <div className="share-url">
            <code>{shareUrl}</code>
            <button onClick={copyLink} className="copy-btn">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="players-list">
          <h3>Players ({gameState.players.length}/4)</h3>
          {gameState.players.map((p) => (
            <div key={p.id} className="player-row">
              <span
                className="player-dot"
                style={{ background: p.color }}
              />
              <span className="player-name">
                {p.name}
                {p.id === gameState.hostId && " (Host)"}
                {p.id === playerId && " (You)"}
              </span>
              <span className={`ready-status ${p.ready ? "ready" : "not-ready"}`}>
                {p.ready ? "Ready" : "Not Ready"}
              </span>
            </div>
          ))}
        </div>

        {!isInGame && (
          <div className="join-form">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin(name.trim())}
              maxLength={20}
            />
            <button onClick={() => onJoin(name.trim())} disabled={!name.trim()}>
              Join Game
            </button>
          </div>
        )}

        {isInGame && (
          <div className="lobby-actions">
            <button onClick={onReady} className="ready-btn">
              {gameState.players.find((p) => p.id === playerId)?.ready
                ? "Unready"
                : "Ready"}
            </button>
            {isHost && (
              <button
                onClick={onStart}
                disabled={!allReady}
                className="start-btn"
              >
                {allReady ? "Start Game" : "Waiting for players..."}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
