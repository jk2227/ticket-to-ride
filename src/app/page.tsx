"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const createGame = async () => {
    if (!name.trim()) return;
    setCreating(true);

    // Ensure player ID exists
    let playerId = localStorage.getItem("ttr-player-id");
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem("ttr-player-id", playerId);
    }
    localStorage.setItem("ttr-player-name", name.trim());

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: name.trim(),
          playerId,
          variant: "new-york",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/game/${data.gameId}`);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="home">
      <div className="home-card">
        <h1>Ticket to Ride</h1>
        <p className="subtitle">New York</p>

        <div className="create-form">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createGame()}
            maxLength={20}
          />
          <button onClick={createGame} disabled={!name.trim() || creating}>
            {creating ? "Creating..." : "Create Game"}
          </button>
        </div>

        <p className="hint">
          Create a game and share the link with friends to play together.
        </p>
      </div>
    </div>
  );
}
