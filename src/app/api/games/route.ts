export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createGame } from "@/game/engine";

export async function POST(request: NextRequest) {
  const { playerName, playerId, variant = "new-york" } = await request.json();

  if (!playerName || !playerId) {
    return NextResponse.json({ error: "Missing playerName or playerId" }, { status: 400 });
  }

  const gameId = nanoid(8);
  const state = createGame(gameId, playerId, playerName, variant);

  const { error } = await getSupabaseAdmin()
    .from("games")
    .insert({ id: gameId, state });

  if (error) {
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  }

  return NextResponse.json({ gameId });
}
