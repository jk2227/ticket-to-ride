"use client";

import { use } from "react";
import { useGame } from "@/hooks/useGame";
import { Lobby } from "@/components/Lobby";
import { Board } from "@/components/Board";
import { PlayerHand } from "@/components/PlayerHand";
import { CardDeck } from "@/components/CardDeck";
import { DestinationPicker } from "@/components/DestinationPicker";
import { ScoreBoard } from "@/components/ScoreBoard";
import { GameOver } from "@/components/GameOver";

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const game = useGame(id);

  if (game.loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading game...</p>
      </div>
    );
  }

  if (!game.gameState) {
    return (
      <div className="loading">
        <p>Game not found</p>
      </div>
    );
  }

  const { gameState, playerId } = game;
  const isInGame = gameState.players.some((p) => p.id === playerId);
  const isMyTurn =
    gameState.phase === "playing" &&
    gameState.players[gameState.currentPlayerIndex]?.id === playerId;
  const hasPendingDestinations =
    gameState.myPlayer?.pendingDestinations &&
    gameState.myPlayer.pendingDestinations.length > 0;

  return (
    <div className="game-page">
      {game.error && <div className="error-toast">{game.error}</div>}

      {gameState.phase === "lobby" && (
        <Lobby
          gameState={gameState}
          playerId={playerId}
          playerName={game.playerName}
          isInGame={isInGame}
          onJoin={game.joinGame}
          onReady={game.toggleReady}
          onStart={game.startGame}
          gameId={id}
        />
      )}

      {(gameState.phase === "choosing-destinations" ||
        gameState.phase === "playing") && (
        <div className="game-layout">
          <ScoreBoard
            gameState={gameState}
            playerId={playerId}
          />
          <div className="game-main">
            <div className="board-area">
              <Board
                gameState={gameState}
                playerId={playerId}
                onClaimRoute={
                  isMyTurn && !hasPendingDestinations
                    ? (routeId, cards) =>
                        game.performAction({
                          type: "claim-route",
                          routeId,
                          cardsUsed: cards,
                        })
                    : undefined
                }
              />
            </div>
            <div className="controls-area">
              <CardDeck
                gameState={gameState}
                isMyTurn={isMyTurn && !hasPendingDestinations}
                onDrawFromDeck={() =>
                  game.performAction({ type: "draw-card", source: "deck" })
                }
                onDrawFaceUp={(index) =>
                  game.performAction({ type: "draw-card", source: index })
                }
                onDrawDestinations={() =>
                  game.performAction({ type: "draw-destinations" })
                }
              />
              {gameState.myPlayer && (
                <PlayerHand player={gameState.myPlayer} />
              )}
            </div>
          </div>

          {hasPendingDestinations && gameState.myPlayer && (
            <DestinationPicker
              destinations={gameState.myPlayer.pendingDestinations!}
              minKeep={gameState.phase === "choosing-destinations" ? 1 : 1}
              onKeep={(ids) =>
                game.performAction({ type: "keep-destinations", keptIds: ids })
              }
            />
          )}

          {gameState.lastRound && (
            <div className="last-round-banner">Last Round!</div>
          )}
        </div>
      )}

      {gameState.phase === "finished" && (
        <GameOver gameState={gameState} playerId={playerId} />
      )}
    </div>
  );
}
