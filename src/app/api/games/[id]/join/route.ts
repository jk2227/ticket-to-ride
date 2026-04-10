export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { addPlayer, filterStateForPlayer } from "@/game/engine";
import { GameState } from "@/game/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { playerId, playerName } = await request.json();

  if (!playerId || !playerName) {
    return NextResponse.json({ error: "Missing playerId or playerName" }, { status: 400 });
  }

  const { data, error: fetchError } = await getSupabaseAdmin()
    .from("games")
    .select("state")
    .eq("id", id)
    .single();

  if (fetchError || !data) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const state = data.state as GameState;

  // If player is already in the game, just reconnect
  const existingPlayer = state.players.find((p) => p.id === playerId);
  if (existingPlayer) {
    existingPlayer.connected = true;
    await getSupabaseAdmin().from("games").update({ state }).eq("id", id);
    return NextResponse.json(filterStateForPlayer(state, playerId));
  }

  const err = addPlayer(state, playerId, playerName);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  const { error: updateError } = await getSupabaseAdmin()
    .from("games")
    .update({ state })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
  }

  return NextResponse.json(filterStateForPlayer(state, playerId));
}
