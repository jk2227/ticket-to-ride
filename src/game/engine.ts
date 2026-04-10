import {
  GameState,
  GameAction,
  Card,
  CardColor,
  Player,
  ClientGameState,
  PublicPlayer,
  ScoreBreakdown,
  DestinationTicket,
  TurnState,
  Route,
  PLAYER_COLORS,
} from "./types";
import { getVariant } from "./constants";

// ---- Helpers ----

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(cardsPerColor: number, wildCards: number): Card[] {
  const colors: CardColor[] = [
    "blue", "green", "orange", "pink", "red", "black", "white", "yellow",
  ];
  const deck: Card[] = [];
  for (const color of colors) {
    for (let i = 0; i < cardsPerColor; i++) {
      deck.push(color);
    }
  }
  for (let i = 0; i < wildCards; i++) {
    deck.push("wild");
  }
  return shuffle(deck);
}

function refillFaceUp(state: GameState): void {
  const variant = getVariant(state.variant);
  while (state.faceUpCards.length < 5 && state.transportationDeck.length > 0) {
    state.faceUpCards.push(state.transportationDeck.pop()!);
  }
  // If 3+ wilds among face-up, discard all and redraw
  let wildCount = state.faceUpCards.filter((c) => c === "wild").length;
  let attempts = 0;
  while (wildCount >= 3 && state.transportationDeck.length >= 5 && attempts < 5) {
    // Put face-up cards back and reshuffle
    state.transportationDeck.push(...state.faceUpCards);
    state.faceUpCards = [];
    state.transportationDeck = shuffle(state.transportationDeck);
    for (let i = 0; i < 5 && state.transportationDeck.length > 0; i++) {
      state.faceUpCards.push(state.transportationDeck.pop()!);
    }
    wildCount = state.faceUpCards.filter((c) => c === "wild").length;
    attempts++;
  }
}

// ---- Game Creation ----

export function createGame(gameId: string, hostId: string, hostName: string, variant: string = "new-york"): GameState {
  const config = getVariant(variant);
  return {
    id: gameId,
    variant,
    phase: "lobby",
    players: [
      {
        id: hostId,
        name: hostName,
        color: PLAYER_COLORS[0],
        hand: [],
        destinationTickets: [],
        pendingDestinations: null,
        taxiCabs: config.startingTaxiCabs,
        ready: false,
        connected: true,
      },
    ],
    currentPlayerIndex: 0,
    transportationDeck: [],
    faceUpCards: [],
    destinationDeck: [],
    routes: config.routes.map((r) => ({ ...r })),
    lastRound: false,
    lastRoundTriggeredBy: null,
    lastRoundTurnsLeft: 0,
    hostId,
    turnState: { cardsDrawn: 0, action: null },
    scores: null,
    winner: null,
  };
}

export function addPlayer(state: GameState, playerId: string, playerName: string): string | null {
  const config = getVariant(state.variant);
  if (state.phase !== "lobby") return "Game has already started";
  if (state.players.length >= config.maxPlayers) return "Game is full";
  if (state.players.find((p) => p.id === playerId)) return "Already in the game";

  const color = PLAYER_COLORS[state.players.length];
  state.players.push({
    id: playerId,
    name: playerName,
    color,
    hand: [],
    destinationTickets: [],
    pendingDestinations: null,
    taxiCabs: config.startingTaxiCabs,
    ready: false,
    connected: true,
  });
  return null;
}

export function setReady(state: GameState, playerId: string): string | null {
  if (state.phase !== "lobby") return "Game has already started";
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return "Player not found";
  player.ready = !player.ready;
  return null;
}

export function startGame(state: GameState, playerId: string): string | null {
  const config = getVariant(state.variant);
  if (state.phase !== "lobby") return "Game has already started";
  if (playerId !== state.hostId) return "Only the host can start the game";
  if (state.players.length < config.minPlayers) return `Need at least ${config.minPlayers} players`;
  if (!state.players.every((p) => p.ready)) return "Not all players are ready";

  // Build and shuffle decks
  state.transportationDeck = buildDeck(config.cardsPerColor, config.wildCards);
  state.destinationDeck = shuffle([...config.destinationTickets]);

  // Deal starting hands
  for (const player of state.players) {
    for (let i = 0; i < config.startingHandSize; i++) {
      if (state.transportationDeck.length > 0) {
        player.hand.push(state.transportationDeck.pop()!);
      }
    }
  }

  // Set up face-up cards
  for (let i = 0; i < 5 && state.transportationDeck.length > 0; i++) {
    state.faceUpCards.push(state.transportationDeck.pop()!);
  }
  refillFaceUp(state);

  // Deal destination tickets for choosing
  for (const player of state.players) {
    const destinations: DestinationTicket[] = [];
    for (let i = 0; i < config.initialDestinationCount; i++) {
      if (state.destinationDeck.length > 0) {
        destinations.push(state.destinationDeck.pop()!);
      }
    }
    player.pendingDestinations = destinations;
  }

  state.phase = "choosing-destinations";
  state.currentPlayerIndex = 0;
  state.turnState = { cardsDrawn: 0, action: null };
  return null;
}

// ---- Game Actions ----

export function performAction(state: GameState, playerId: string, action: GameAction): string | null {
  if (state.phase === "choosing-destinations") {
    if (action.type !== "keep-destinations") {
      return "You must choose your destination tickets first";
    }
    return handleKeepDestinations(state, playerId, action.keptIds);
  }

  if (state.phase !== "playing") return "Game is not in progress";

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return "Not your turn";

  // If player has pending destinations, they must resolve them first
  if (currentPlayer.pendingDestinations) {
    if (action.type !== "keep-destinations") {
      return "You must choose which destination tickets to keep";
    }
    return handleKeepDestinations(state, playerId, action.keptIds);
  }

  switch (action.type) {
    case "draw-card":
      return handleDrawCard(state, playerId, action.source);
    case "claim-route":
      return handleClaimRoute(state, playerId, action.routeId, action.cardsUsed);
    case "draw-destinations":
      return handleDrawDestinations(state, playerId);
    default:
      return "Invalid action";
  }
}

function handleDrawCard(state: GameState, playerId: string, source: "deck" | number): string | null {
  const player = state.players.find((p) => p.id === playerId)!;
  const turnState = state.turnState;

  // Can't mix actions in a turn
  if (turnState.action && turnState.action !== "draw-card") {
    return "You've already started a different action this turn";
  }

  if (turnState.cardsDrawn >= 2) return "You've already drawn 2 cards this turn";

  if (source === "deck") {
    if (state.transportationDeck.length === 0) {
      return "The deck is empty";
    }
    player.hand.push(state.transportationDeck.pop()!);
    turnState.action = "draw-card";
    turnState.cardsDrawn++;
  } else {
    // Drawing from face-up
    const index = source;
    if (index < 0 || index >= state.faceUpCards.length) {
      return "Invalid face-up card index";
    }
    const card = state.faceUpCards[index];

    // Wild card from face-up counts as both draws
    if (card === "wild") {
      if (turnState.cardsDrawn > 0) {
        return "You can't draw a face-up wild as your second card";
      }
      player.hand.push(card);
      state.faceUpCards.splice(index, 1);
      refillFaceUp(state);
      turnState.action = "draw-card";
      turnState.cardsDrawn = 2; // Wild counts as full turn
    } else {
      player.hand.push(card);
      state.faceUpCards.splice(index, 1);
      refillFaceUp(state);
      turnState.action = "draw-card";
      turnState.cardsDrawn++;
    }
  }

  // End turn after 2 draws
  if (turnState.cardsDrawn >= 2) {
    endTurn(state);
  }

  return null;
}

function handleClaimRoute(
  state: GameState,
  playerId: string,
  routeId: number,
  cardsUsed: Card[]
): string | null {
  const player = state.players.find((p) => p.id === playerId)!;
  const config = getVariant(state.variant);

  if (state.turnState.action) return "You've already started an action this turn";

  const route = state.routes.find((r) => r.id === routeId);
  if (!route) return "Route not found";
  if (route.claimedBy) return "Route already claimed";

  // Check player has enough taxis
  if (player.taxiCabs < route.length) return "Not enough taxi cabs";

  // Validate cards
  if (cardsUsed.length !== route.length) {
    return `Route requires exactly ${route.length} cards`;
  }

  // Check player has these cards in hand
  const handCopy = [...player.hand];
  for (const card of cardsUsed) {
    const idx = handCopy.indexOf(card);
    if (idx === -1) return "You don't have those cards";
    handCopy.splice(idx, 1);
  }

  // Validate card colors
  const nonWilds = cardsUsed.filter((c) => c !== "wild");
  if (nonWilds.length > 0) {
    const color = nonWilds[0];
    if (!nonWilds.every((c) => c === color)) {
      return "All non-wild cards must be the same color";
    }
    if (route.color !== "wild" && color !== route.color) {
      return "Cards don't match the route color";
    }
  }
  // All wilds is fine for any route

  // Remove cards from hand
  for (const card of cardsUsed) {
    const idx = player.hand.indexOf(card);
    player.hand.splice(idx, 1);
  }

  // Claim route
  route.claimedBy = playerId;
  player.taxiCabs -= route.length;

  state.turnState.action = "claim-route";

  // Check for end game trigger
  if (player.taxiCabs <= config.endGameTaxiThreshold && !state.lastRound) {
    state.lastRound = true;
    state.lastRoundTriggeredBy = playerId;
    state.lastRoundTurnsLeft = state.players.length; // everyone else gets one turn
  }

  endTurn(state);
  return null;
}

function handleDrawDestinations(state: GameState, playerId: string): string | null {
  const player = state.players.find((p) => p.id === playerId)!;
  const config = getVariant(state.variant);

  if (state.turnState.action) return "You've already started an action this turn";
  if (state.destinationDeck.length === 0) return "No destination tickets left";

  const count = Math.min(config.drawDestinationCount, state.destinationDeck.length);
  const destinations: DestinationTicket[] = [];
  for (let i = 0; i < count; i++) {
    destinations.push(state.destinationDeck.pop()!);
  }

  player.pendingDestinations = destinations;
  state.turnState.action = "draw-destinations";
  // Don't end turn yet - player must choose which to keep
  return null;
}

function handleKeepDestinations(state: GameState, playerId: string, keptIds: number[]): string | null {
  const player = state.players.find((p) => p.id === playerId)!;
  const config = getVariant(state.variant);

  if (!player.pendingDestinations) return "No pending destinations to choose from";

  const minKeep = state.phase === "choosing-destinations"
    ? config.minInitialDestinationsToKeep
    : config.minDestinationsToKeep;

  if (keptIds.length < minKeep) {
    return `You must keep at least ${minKeep} destination ticket(s)`;
  }

  const pendingIds = player.pendingDestinations.map((d) => d.id);
  for (const id of keptIds) {
    if (!pendingIds.includes(id)) return "Invalid destination ticket ID";
  }

  // Keep selected, return others to bottom of deck
  const kept = player.pendingDestinations.filter((d) => keptIds.includes(d.id));
  const returned = player.pendingDestinations.filter((d) => !keptIds.includes(d.id));

  player.destinationTickets.push(...kept);
  state.destinationDeck.unshift(...returned); // Return to bottom

  player.pendingDestinations = null;

  if (state.phase === "choosing-destinations") {
    // Check if all players have chosen
    const allChosen = state.players.every((p) => p.pendingDestinations === null);
    if (allChosen) {
      state.phase = "playing";
      state.currentPlayerIndex = 0;
      state.turnState = { cardsDrawn: 0, action: null };
    }
  } else {
    // During gameplay, end the turn after choosing
    endTurn(state);
  }

  return null;
}

function endTurn(state: GameState): void {
  if (state.lastRound) {
    state.lastRoundTurnsLeft--;
    if (state.lastRoundTurnsLeft <= 0) {
      finishGame(state);
      return;
    }
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.turnState = { cardsDrawn: 0, action: null };
}

// ---- Scoring ----

function isDestinationCompleted(
  ticket: DestinationTicket,
  routes: Route[],
  playerId: string
): boolean {
  // BFS to check if from and to are connected by player's claimed routes
  const playerRoutes = routes.filter((r) => r.claimedBy === playerId);
  const adjacency: Record<string, string[]> = {};

  for (const route of playerRoutes) {
    if (!adjacency[route.from]) adjacency[route.from] = [];
    if (!adjacency[route.to]) adjacency[route.to] = [];
    adjacency[route.from].push(route.to);
    adjacency[route.to].push(route.from);
  }

  const visited = new Set<string>();
  const queue = [ticket.from];
  visited.add(ticket.from);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === ticket.to) return true;
    for (const neighbor of adjacency[current] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

function calculateScores(state: GameState): Record<string, ScoreBreakdown> {
  const config = getVariant(state.variant);
  const scores: Record<string, ScoreBreakdown> = {};

  for (const player of state.players) {
    // Route points
    let routePoints = 0;
    for (const route of state.routes) {
      if (route.claimedBy === player.id) {
        routePoints += config.routePointValues[route.length] || 0;
      }
    }

    // Destination ticket points
    const completedDestinations = player.destinationTickets.map((ticket) => ({
      ticket,
      completed: isDestinationCompleted(ticket, state.routes, player.id),
    }));

    let destinationPoints = 0;
    for (const { ticket, completed } of completedDestinations) {
      destinationPoints += completed ? ticket.points : -ticket.points;
    }

    const totalScore = routePoints + destinationPoints;

    scores[player.id] = {
      routePoints,
      completedDestinations,
      destinationPoints,
      longestRouteBonus: 0,
      totalScore,
    };
  }

  return scores;
}

function finishGame(state: GameState): void {
  state.phase = "finished";
  state.scores = calculateScores(state);

  // Find winner
  let maxScore = -Infinity;
  let winnerId: string | null = null;
  for (const [playerId, score] of Object.entries(state.scores)) {
    if (score.totalScore > maxScore) {
      maxScore = score.totalScore;
      winnerId = playerId;
    }
  }
  state.winner = winnerId;
}

// ---- State Filtering ----

export function filterStateForPlayer(state: GameState, playerId: string | null): ClientGameState {
  const myPlayer = playerId ? state.players.find((p) => p.id === playerId) || null : null;

  // In finished state, show all destination tickets
  const isFinished = state.phase === "finished";

  const publicPlayers: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    handCount: p.hand.length,
    destinationTicketCount: p.destinationTickets.length,
    taxiCabs: p.taxiCabs,
    ready: p.ready,
    connected: p.connected,
  }));

  return {
    id: state.id,
    variant: state.variant,
    phase: state.phase,
    players: publicPlayers,
    currentPlayerIndex: state.currentPlayerIndex,
    myPlayer: myPlayer
      ? {
          ...myPlayer,
          // In finished state, show full info (scores page will display it)
        }
      : null,
    faceUpCards: state.faceUpCards,
    deckCount: state.transportationDeck.length,
    destinationDeckCount: state.destinationDeck.length,
    routes: state.routes,
    lastRound: state.lastRound,
    hostId: state.hostId,
    turnState: state.turnState,
    scores: state.scores,
    winner: state.winner,
  };
}

export function reconnectPlayer(state: GameState, playerId: string): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return "Player not found in this game";
  player.connected = true;
  return null;
}
