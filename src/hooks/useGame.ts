"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { ClientGameState, GameAction } from "@/game/types";

const POLL_INTERVAL = 2000;

function generateId(): string {
  // crypto.randomUUID() requires a secure context (HTTPS or localhost).
  // When accessed over HTTP from a phone on the local network, it's unavailable.
  try {
    return crypto.randomUUID();
  } catch {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}

function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("ttr-player-id");
  if (!id) {
    id = generateId();
    localStorage.setItem("ttr-player-id", id);
  }
  return id;
}

function getPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ttr-player-name");
}

function setPlayerName(name: string): void {
  localStorage.setItem("ttr-player-name", name);
}

function playTurnSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    // Two-tone chime
    osc.frequency.setValueAtTime(587, ctx.currentTime);      // D5
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.15); // G5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext not available
  }
}

function flashTitle(message: string) {
  const original = document.title;
  let on = true;
  const interval = setInterval(() => {
    document.title = on ? message : original;
    on = !on;
  }, 1000);

  const stop = () => {
    clearInterval(interval);
    document.title = original;
    window.removeEventListener("focus", stop);
  };

  if (document.hasFocus()) {
    // If already focused, flash briefly then stop
    setTimeout(stop, 3000);
  } else {
    window.addEventListener("focus", stop);
  }
}

export function useGame(gameId: string) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playerId = useRef(getPlayerId());
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);
  const wasMyTurn = useRef(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}?playerId=${playerId.current}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to fetch game");
        return;
      }
      const data = await res.json();
      setGameState(data);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Broadcast notification to other players
  const notifyUpdate = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "state-updated",
        payload: { timestamp: Date.now() },
      });
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = getSupabase().channel(`game:${gameId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "state-updated" }, () => {
        fetchState();
      })
      .subscribe();

    // Initial fetch
    fetchState();

    // Polling fallback
    const interval = setInterval(fetchState, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [gameId, fetchState]);

  // Notify when it becomes your turn
  useEffect(() => {
    if (!gameState || gameState.phase !== "playing") {
      wasMyTurn.current = false;
      return;
    }
    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === playerId.current;
    if (isMyTurn && !wasMyTurn.current) {
      playTurnSound();
      flashTitle("Your turn!");
    }
    wasMyTurn.current = isMyTurn;
  }, [gameState]);

  const joinGame = useCallback(
    async (name: string) => {
      setPlayerName(name);
      const res = await fetch(`/api/games/${gameId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: playerId.current, playerName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setGameState(data);
      notifyUpdate();
    },
    [gameId, notifyUpdate]
  );

  const toggleReady = useCallback(async () => {
    const res = await fetch(`/api/games/${gameId}/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: playerId.current }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setGameState(data);
    notifyUpdate();
  }, [gameId, notifyUpdate]);

  const startGame = useCallback(async () => {
    const res = await fetch(`/api/games/${gameId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: playerId.current }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setGameState(data);
    notifyUpdate();
  }, [gameId, notifyUpdate]);

  const performAction = useCallback(
    async (action: GameAction) => {
      const res = await fetch(`/api/games/${gameId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: playerId.current, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setTimeout(() => setError(null), 3000);
        return;
      }
      setGameState(data);
      notifyUpdate();
    },
    [gameId, notifyUpdate]
  );

  return {
    gameState,
    loading,
    error,
    playerId: playerId.current,
    playerName: getPlayerName(),
    joinGame,
    toggleReady,
    startGame,
    performAction,
    setError,
  };
}
