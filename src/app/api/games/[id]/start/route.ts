export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { startGame, filterStateForPlayer } from "@/game/engine";
import { GameState } from "@/game/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { playerId } = await request.json();

  const { data, error: fetchError } = await getSupabaseAdmin()
    .from("games")
    .select("state")
    .eq("id", id)
    .single();

  if (fetchError || !data) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const state = data.state as GameState;
  const err = startGame(state, playerId);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  await getSupabaseAdmin().from("games").update({ state }).eq("id", id);
  return NextResponse.json(filterStateForPlayer(state, playerId));
}
