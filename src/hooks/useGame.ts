"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { ClientGameState, GameAction } from "@/game/types";

const POLL_INTERVAL = 2000;

function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("ttr-player-id");
  if (!id) {
    id = crypto.randomUUID();
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

export function useGame(gameId: string) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playerId = useRef(getPlayerId());
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);

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
