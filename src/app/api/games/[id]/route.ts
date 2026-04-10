export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { filterStateForPlayer } from "@/game/engine";
import { GameState } from "@/game/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = request.nextUrl.searchParams.get("playerId");

  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("state")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const state = data.state as GameState;
  const clientState = filterStateForPlayer(state, playerId);

  return NextResponse.json(clientState);
}
