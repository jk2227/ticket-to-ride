// ---- Card Types ----

export type CardColor =
  | "blue"
  | "green"
  | "orange"
  | "pink"
  | "red"
  | "black"
  | "white"
  | "yellow";

export type Card = CardColor | "wild";

// ---- Map Types ----

export interface Location {
  id: string;
  name: string;
  x: number; // SVG coordinate
  y: number;
}

export interface Route {
  id: number;
  from: string; // location id
  to: string;
  length: number;
  color: Card; // "wild" means any color can be used
  claimedBy: string | null; // player id
}

export interface DestinationTicket {
  id: number;
  from: string; // location id
  to: string;
  points: number;
}

// ---- Player Types ----

export type PlayerColor = "red" | "blue" | "green" | "yellow";

export const PLAYER_COLORS: PlayerColor[] = [
  "red",
  "blue",
  "green",
  "yellow",
];

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  hand: Card[];
  destinationTickets: DestinationTicket[];
  pendingDestinations: DestinationTicket[] | null; // destinations being chosen
  taxiCabs: number;
  ready: boolean;
  connected: boolean;
}

// ---- Game State ----

export type GamePhase =
  | "lobby"
  | "choosing-destinations" // initial destination selection
  | "playing"
  | "finished";

export type ActionType =
  | "draw-card"
  | "claim-route"
  | "draw-destinations"
  | "keep-destinations";

export interface DrawCardAction {
  type: "draw-card";
  source: "deck" | number; // number = face-up card index
}

export interface ClaimRouteAction {
  type: "claim-route";
  routeId: number;
  cardsUsed: Card[];
}

export interface DrawDestinationsAction {
  type: "draw-destinations";
}

export interface KeepDestinationsAction {
  type: "keep-destinations";
  keptIds: number[];
}

export type GameAction =
  | DrawCardAction
  | ClaimRouteAction
  | DrawDestinationsAction
  | KeepDestinationsAction;

export interface GameState {
  id: string;
  variant: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  transportationDeck: Card[];
  faceUpCards: Card[];
  destinationDeck: DestinationTicket[];
  routes: Route[];
  lastRound: boolean;
  lastRoundTriggeredBy: string | null;
  lastRoundTurnsLeft: number;
  hostId: string;
  turnState: TurnState;
  scores: Record<string, ScoreBreakdown> | null; // only set when game is finished
  winner: string | null;
}

export interface TurnState {
  cardsDrawn: number; // 0, 1, or 2 for the current turn
  action: ActionType | null; // what action the player is currently doing
}

export interface ScoreBreakdown {
  routePoints: number;
  completedDestinations: { ticket: DestinationTicket; completed: boolean }[];
  destinationPoints: number; // positive for completed, negative for incomplete
  longestRouteBonus: number; // not used in NY but placeholder for variants
  totalScore: number;
}

// ---- Variant Config ----

export interface VariantConfig {
  name: string;
  slug: string;
  locations: Location[];
  routes: Route[];
  destinationTickets: DestinationTicket[];
  maxPlayers: number;
  minPlayers: number;
  startingTaxiCabs: number;
  startingHandSize: number;
  initialDestinationCount: number; // how many to draw at start
  minInitialDestinationsToKeep: number;
  drawDestinationCount: number; // how many to draw during game
  minDestinationsToKeep: number;
  endGameTaxiThreshold: number; // game ends when player has <= this many
  cardsPerColor: number;
  wildCards: number;
  routePointValues: Record<number, number>;
}

// ---- Client-visible state (filtered) ----

export interface PublicPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  handCount: number;
  destinationTicketCount: number;
  taxiCabs: number;
  ready: boolean;
  connected: boolean;
}

export interface ClientGameState {
  id: string;
  variant: string;
  phase: GamePhase;
  players: PublicPlayer[];
  currentPlayerIndex: number;
  myPlayer: Player | null; // full info for the requesting player
  faceUpCards: Card[];
  deckCount: number;
  destinationDeckCount: number;
  routes: Route[];
  lastRound: boolean;
  hostId: string;
  turnState: TurnState;
  scores: Record<string, ScoreBreakdown> | null;
  winner: string | null;
}
