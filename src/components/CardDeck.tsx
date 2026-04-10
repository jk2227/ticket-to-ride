"use client";

import { ClientGameState, Card } from "@/game/types";

const CARD_COLORS: Record<Card, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  orange: "#f97316",
  pink: "#ec4899",
  red: "#ef4444",
  black: "#374151",
  white: "#e5e7eb",
  yellow: "#eab308",
  wild: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6, #3b82f6)",
};

interface CardDeckProps {
  gameState: ClientGameState;
  isMyTurn: boolean;
  onDrawFromDeck: () => void;
  onDrawFaceUp: (index: number) => void;
  onDrawDestinations: () => void;
}

export function CardDeck({
  gameState,
  isMyTurn,
  onDrawFromDeck,
  onDrawFaceUp,
  onDrawDestinations,
}: CardDeckProps) {
  const canDraw = isMyTurn && (
    gameState.turnState.action === null ||
    (gameState.turnState.action === "draw-card" && gameState.turnState.cardsDrawn < 2)
  );
  const canDrawDestinations = isMyTurn && gameState.turnState.action === null && gameState.destinationDeckCount > 0;

  const isSecondDraw = gameState.turnState.action === "draw-card" && gameState.turnState.cardsDrawn === 1;

  return (
    <div className="card-deck">
      <div className="deck-section">
        <h3>Draw Cards</h3>
        {isMyTurn && gameState.turnState.action === "draw-card" && (
          <p className="draw-hint">
            Drew {gameState.turnState.cardsDrawn}/2 cards
          </p>
        )}

        <div className="face-up-cards">
          {gameState.faceUpCards.map((card, index) => {
            const isWild = card === "wild";
            const disabled = !canDraw || (isSecondDraw && isWild);
            return (
              <button
                key={index}
                className="face-up-card"
                style={{ background: CARD_COLORS[card] }}
                onClick={() => onDrawFaceUp(index)}
                disabled={disabled}
                title={
                  disabled && isWild && isSecondDraw
                    ? "Can't draw a wild as second card"
                    : card
                }
              >
                <span style={{ color: card === "white" || card === "yellow" ? "#333" : "#fff" }}>
                  {card === "wild" ? "W" : card.charAt(0).toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="deck-actions">
          <button
            className="draw-deck-btn"
            onClick={onDrawFromDeck}
            disabled={!canDraw || gameState.deckCount === 0}
          >
            Draw from Deck ({gameState.deckCount})
          </button>
          <button
            className="draw-dest-btn"
            onClick={onDrawDestinations}
            disabled={!canDrawDestinations}
          >
            Draw Destinations ({gameState.destinationDeckCount})
          </button>
        </div>
      </div>
    </div>
  );
}
