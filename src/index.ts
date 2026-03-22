/**
 * GENESIS-BRIGHTON-PROTOCOL v0.1 — Silent Observer / Corpus Builder
 *
 * "A newborn brain — constantly learning, building, seeing new horizons."
 *
 * The never-ending intelligence loop. Cold start from day one.
 * Absorbs every event from GTC corpus, detects patterns, scores confidence.
 *
 * v0.1 = SILENT OBSERVER. No action taken. Intelligence only.
 * Future versions will feed patterns to DARPA for mission planning
 * and Academy for operator training.
 *
 * Confidence doctrine:
 *   1x  = ANECDOTE     — interesting but unverified
 *   5x  = HYPOTHESIS   — emerging pattern, monitor closely
 *   20x = ACTIONABLE   — reliable enough for automated decisions
 *   50x = DOCTRINE     — proven pattern, weaponise
 *
 * Port: 8670
 */

import express from "express";
import { CorpusReaderService } from "./services/corpus-reader.service";
import { PatternDetectorService } from "./services/pattern-detector.service";

const PORT = parseInt(process.env.PORT || "8670", 10);

const app = express();
app.use(express.json());

const reader = new CorpusReaderService();
const detector = new PatternDetectorService();

// Wire: every event from corpus → Brighton's brain
reader.onEvent((event) => detector.ingest(event));

// ── Boot sequence ──
async function boot(): Promise<void> {
  console.log(`[BRIGHTON] Brighton Protocol v0.1 — Silent Observer Mode`);
  console.log(`[BRIGHTON] "A newborn brain — constantly learning, building, seeing new horizons."`);

  // Phase 1: Historical scan — catch up on everything before we were born
  const historicalCount = await reader.scanHistorical();
  console.log(`[BRIGHTON] Historical corpus absorbed: ${historicalCount} events`);

  // Phase 2: Start live tail — absorb new events as they arrive
  reader.startTail();

  // Phase 3: Start pattern analysis
  detector.startAnalysis();

  console.log(`[BRIGHTON] Boot complete — brain is active`);
}

// ── GET /health ──
app.get("/health", (_req, res) => {
  const state = detector.getState();
  const byConfidence = detector.getConfidenceDistribution();

  res.json({
    service: "genesis-brighton-protocol",
    version: "0.1.0",
    status: state.mode === "COLD_START" ? "AMBER" : "GREEN",
    role: "SILENT_OBSERVER",
    mode: state.mode,
    corpusEventsProcessed: state.corpusEventsProcessed,
    patternsDetected: state.patternsDetected,
    confidence: byConfidence,
    lastAnalysisAt: state.lastAnalysisAt,
    analysisCount: state.analysisCount,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── GET /state — Full Brighton intelligence state ──
app.get("/state", (_req, res) => {
  const state = detector.getState();

  res.json({
    brighton: state,
    topPatterns: detector.getPatterns({ limit: 50 }),
    doctrine: detector.getPatterns({ minConfidence: "DOCTRINE" }),
    actionable: detector.getPatterns({ minConfidence: "ACTIONABLE" }),
    hypotheses: detector.getPatterns({ minConfidence: "HYPOTHESIS", limit: 30 }),
    corpus: {
      totalEventsRead: reader.getTotalEventsRead(),
      oldestEvent: reader.getOldestEvent(),
      newestEvent: reader.getNewestEvent(),
    },
  });
});

// ── GET /patterns — Query patterns with filters ──
app.get("/patterns", (req, res) => {
  const type = req.query.type as string | undefined;
  const minConfidence = req.query.minConfidence as string | undefined;
  const activeOnly = req.query.activeOnly === "true";
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

  const patterns = detector.getPatterns({
    type: type as any,
    minConfidence: minConfidence as any,
    activeOnly,
    limit,
  });

  res.json({
    count: patterns.length,
    filters: { type, minConfidence, activeOnly, limit },
    patterns,
  });
});

// ── GET /patterns/:type — Patterns by type ──
app.get("/patterns/:type", (req, res) => {
  const patterns = detector.getPatterns({
    type: req.params.type as any,
    activeOnly: true,
  });

  res.json({
    type: req.params.type,
    count: patterns.length,
    patterns,
  });
});

// ── POST /ingest — Accept events directly (bypass GTC file read) ──
// Allows other services to push events directly to Brighton
app.post("/ingest", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ accepted: false, reason: "empty_body" });
    return;
  }

  detector.ingest(body);
  res.status(200).json({ accepted: true, eventsProcessed: detector.getEventsProcessed() });
});

// ── GET /intelligence — The intelligence briefing ──
// Summary of actionable intelligence for human consumption
app.get("/intelligence", (_req, res) => {
  const state = detector.getState();
  const actionable = detector.getPatterns({ minConfidence: "ACTIONABLE", activeOnly: true });
  const doctrine = detector.getPatterns({ minConfidence: "DOCTRINE", activeOnly: true });

  // Best exchange pairs by success rate
  const pairPatterns = detector.getPatterns({ type: "EXCHANGE_PAIR_ALPHA", activeOnly: true, limit: 10 });
  const bestPairs = pairPatterns
    .filter(p => p.evidence.successRate > 0.5 && p.evidence.occurrences >= 5)
    .slice(0, 5);

  // Best tokens
  const tokenPatterns = detector.getPatterns({ type: "TOKEN_SPECIALIST", activeOnly: true, limit: 10 });
  const bestTokens = tokenPatterns
    .filter(p => p.evidence.successRate > 0.5 && p.evidence.occurrences >= 3)
    .slice(0, 5);

  // Temporal windows
  const timePatterns = detector.getPatterns({ type: "TEMPORAL_WINDOW", activeOnly: true, limit: 10 });
  const bestTimes = timePatterns
    .filter(p => p.evidence.occurrences >= 5)
    .slice(0, 5);

  // Failure hotspots
  const failPatterns = detector.getPatterns({ type: "FAILURE_CORRELATION", activeOnly: true, limit: 5 });

  res.json({
    briefing: {
      mode: state.mode,
      totalIntelligence: state.patternsDetected,
      doctrineCount: doctrine.length,
      actionableCount: actionable.length,
      eventsAnalysed: state.corpusEventsProcessed,
    },
    recommendations: {
      bestExchangePairs: bestPairs.map(p => ({
        route: p.trigger.exchangePair,
        trades: p.evidence.occurrences,
        successRate: `${(p.evidence.successRate * 100).toFixed(0)}%`,
        avgSpreadBps: p.evidence.avgSpreadBps,
        avgPnlUsd: p.evidence.avgPnlUsd,
        confidence: p.confidence,
      })),
      bestTokens: bestTokens.map(p => ({
        token: p.trigger.token,
        route: p.trigger.exchangePair,
        trades: p.evidence.occurrences,
        successRate: `${(p.evidence.successRate * 100).toFixed(0)}%`,
        avgPnlUsd: p.evidence.avgPnlUsd,
        confidence: p.confidence,
      })),
      bestTimes: bestTimes.map(p => ({
        route: p.trigger.exchangePair,
        token: p.trigger.token,
        hourUtc: p.trigger.hourOfDay,
        dayOfWeek: p.trigger.dayOfWeek,
        trades: p.evidence.occurrences,
        avgSpreadBps: p.evidence.avgSpreadBps,
        confidence: p.confidence,
      })),
      failureHotspots: failPatterns.map(p => ({
        route: p.trigger.exchangePair,
        failures: p.evidence.occurrences,
        description: p.description,
        confidence: p.confidence,
      })),
    },
    doctrine: doctrine.map(p => ({
      type: p.type,
      description: p.description,
      score: p.confidenceScore,
      occurrences: p.evidence.occurrences,
    })),
    timestamp: new Date().toISOString(),
  });
});

// ── Forward DOCTRINE patterns to Whiteboard ──
const WHITEBOARD_URL = process.env.WHITEBOARD_URL || "";
const forwardedToWhiteboard = new Set<string>();

function forwardDoctrineToWhiteboard(): void {
  if (!WHITEBOARD_URL) return;

  const doctrine = detector.getPatterns({ minConfidence: "DOCTRINE", activeOnly: true });

  for (const pattern of doctrine) {
    if (forwardedToWhiteboard.has(pattern.id)) continue;

    fetch(`${WHITEBOARD_URL}/intel/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "PATTERN",
        source: "BRIGHTON",
        intelligence: `${pattern.type}: ${pattern.description} (${pattern.evidence.occurrences} occurrences, ${(pattern.evidence.successRate * 100).toFixed(0)}% success, avg spread ${pattern.evidence.avgSpreadBps}bps)`,
        affectedRails: ["ALL"],
        affectedClasses: [],
        evidence: [pattern.id],
        tags: [pattern.type, pattern.confidence, ...(pattern.trigger.exchangePair ? [pattern.trigger.exchangePair] : [])],
      }),
      signal: AbortSignal.timeout(5000),
    }).then(() => {
      forwardedToWhiteboard.add(pattern.id);
    }).catch(() => {});
  }
}

// Forward doctrine patterns every 5 minutes
setInterval(() => forwardDoctrineToWhiteboard(), 300000);

// ── Start ──
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[BRIGHTON] Genesis Brighton Protocol listening on port ${PORT}`);
  console.log(`[BRIGHTON] Role: SILENT_OBSERVER — Intelligence only, no action`);
  console.log(`[BRIGHTON] Endpoints: /health, /state, /patterns, /intelligence, /ingest`);

  // Boot asynchronously — don't block the HTTP server
  boot().catch((err) => {
    console.error(`[BRIGHTON] Boot error: ${err instanceof Error ? err.message : "Unknown"}`);
  });
});
