/**
 * GENESIS-BRIGHTON-PROTOCOL — Type Definitions
 *
 * Intelligence primitives for the never-ending learning loop.
 */

/** Raw event from GTC corpus — the input to Brighton's brain */
export interface CorpusEvent {
  receivedAt: string;
  eventType: string;
  source: string;
  eventId?: string;
  payload?: {
    pair?: string;
    token?: string;
    buyExchange?: string;
    sellExchange?: string;
    buyPrice?: number;
    sellPrice?: number;
    grossSpreadBps?: number;
    netSpreadBps?: number;
    realizedPnl?: number;
    status?: string;
    network?: string;
    quantity?: number;
    transferTimeMs?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Detected pattern — the output of Brighton's observation */
export interface Pattern {
  id: string;
  type: PatternType;
  description: string;
  /** What triggered the pattern detection */
  trigger: {
    exchangePair?: string;    // e.g., "binance→kucoin"
    token?: string;
    hourOfDay?: number;       // 0-23 UTC
    dayOfWeek?: number;       // 0=Sun, 6=Sat
  };
  /** Statistical evidence */
  evidence: {
    occurrences: number;
    firstSeen: string;        // ISO timestamp
    lastSeen: string;
    avgSpreadBps: number;
    avgPnlUsd: number;
    successRate: number;      // 0-1
    avgTransferTimeMs?: number;
  };
  /** Confidence score — the heart of Brighton */
  confidence: ConfidenceLevel;
  confidenceScore: number;    // 0-100
  /** When this pattern was last updated */
  updatedAt: string;
  /** Is this pattern currently active (seen recently)? */
  active: boolean;
}

export type PatternType =
  | "EXCHANGE_PAIR_ALPHA"       // Consistent spread on a specific exchange pair
  | "TEMPORAL_WINDOW"           // Spread appears at predictable times
  | "TOKEN_SPECIALIST"          // Specific tokens reliably profitable on specific routes
  | "NETWORK_EFFICIENCY"        // Certain networks faster/cheaper for certain routes
  | "FAILURE_CORRELATION"       // Failures correlate with conditions (time, exchange, token)
  | "TRANSFER_TIME_PATTERN"     // Transfer times predictable by network/exchange
  | "SPREAD_DECAY"              // Spreads decay over time (stale data signal)
  | "EXCHANGE_DARK_PATTERN";    // Exchange downtime patterns

/** Confidence levels — Commander's doctrine */
export type ConfidenceLevel =
  | "ANECDOTE"      // 1-4 occurrences — interesting but unverified
  | "HYPOTHESIS"    // 5-19 occurrences — emerging pattern, monitor closely
  | "ACTIONABLE"    // 20-49 occurrences — reliable enough for automated decisions
  | "DOCTRINE";     // 50+ occurrences — proven pattern, weaponise

/** Brighton's internal state summary */
export interface BrightonState {
  mode: "COLD_START" | "ACCUMULATING" | "PATTERN_DETECTION" | "ACTIVE";
  corpusEventsProcessed: number;
  patternsDetected: number;
  patternsByConfidence: Record<ConfidenceLevel, number>;
  patternsByType: Record<string, number>;
  oldestEventProcessed: string | null;
  newestEventProcessed: string | null;
  lastAnalysisAt: string | null;
  analysisCount: number;
  uptimeSeconds: number;
}

/** Temporal bucket for time-based pattern detection */
export interface TemporalBucket {
  hourOfDay: number;
  dayOfWeek: number;
  exchangePair: string;
  token: string;
  occurrences: number;
  avgSpreadBps: number;
  totalPnlUsd: number;
  successCount: number;
  failCount: number;
}
