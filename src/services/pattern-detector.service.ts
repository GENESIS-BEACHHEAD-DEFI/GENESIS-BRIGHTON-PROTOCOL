/**
 * GENESIS-BRIGHTON-PROTOCOL — Pattern Detector Service
 *
 * The analytical brain of Brighton. Absorbs every event from GTC corpus
 * and detects patterns across multiple dimensions:
 *
 *   1. Exchange pair alpha     — which routes consistently profitable?
 *   2. Temporal windows        — what times of day/week do spreads appear?
 *   3. Token specialists       — which tokens are reliable on which routes?
 *   4. Network efficiency      — which transfer networks are fastest/cheapest?
 *   5. Failure correlations    — what conditions predict failures?
 *   6. Transfer time patterns  — how long do transfers actually take?
 *   7. Spread decay            — how fast do spreads close? (stale data signal)
 *   8. Exchange dark patterns  — when do exchanges go down?
 *
 * v0.1 = Silent observer. Accumulates. Detects. Scores.
 * No action taken — intelligence only. The cold start.
 *
 * "A newborn brain — constantly learning, building, seeing new horizons."
 */

import { randomUUID } from "crypto";
import type {
  CorpusEvent,
  Pattern,
  PatternType,
  ConfidenceLevel,
  BrightonState,
  TemporalBucket,
} from "../types";
import { ConfidenceScorerService, type ScoredPattern } from "./confidence-scorer.service";

const ANALYSIS_INTERVAL_MS = parseInt(process.env.BRIGHTON_ANALYSIS_INTERVAL_MS || "300000", 10); // 5 min

export class PatternDetectorService {
  private scorer = new ConfidenceScorerService();
  private patterns: Map<string, Pattern> = new Map();

  // Accumulation buckets — raw data before pattern extraction
  private exchangePairStats: Map<string, {
    occurrences: number;
    totalSpreadBps: number;
    totalPnlUsd: number;
    successCount: number;
    failCount: number;
    firstSeen: string;
    lastSeen: string;
  }> = new Map();

  private temporalBuckets: Map<string, TemporalBucket> = new Map();

  private tokenRouteStats: Map<string, {
    occurrences: number;
    totalSpreadBps: number;
    totalPnlUsd: number;
    successCount: number;
    failCount: number;
    firstSeen: string;
    lastSeen: string;
  }> = new Map();

  private networkStats: Map<string, {
    occurrences: number;
    totalTransferTimeMs: number;
    successCount: number;
    failCount: number;
    firstSeen: string;
    lastSeen: string;
  }> = new Map();

  private failureStats: Map<string, {
    occurrences: number;
    reasons: Record<string, number>;
    firstSeen: string;
    lastSeen: string;
  }> = new Map();

  // Counters
  private eventsProcessed = 0;
  private analysisCount = 0;
  private analysisTimer: ReturnType<typeof setInterval> | null = null;
  private oldestProcessed: string | null = null;
  private newestProcessed: string | null = null;
  private lastAnalysisAt: string | null = null;

  /**
   * Ingest a single event from the corpus.
   * Called for every event — historical and live.
   */
  ingest(event: CorpusEvent): void {
    this.eventsProcessed++;

    const timestamp = event.receivedAt || new Date().toISOString();
    if (!this.oldestProcessed || timestamp < this.oldestProcessed) {
      this.oldestProcessed = timestamp;
    }
    if (!this.newestProcessed || timestamp > this.newestProcessed) {
      this.newestProcessed = timestamp;
    }

    const eventType = event.eventType || "";
    const payload = event.payload || {};

    switch (eventType) {
      case "BEACHHEAD_EXECUTION":
        this.ingestExecution(payload, timestamp);
        break;
      case "GUARD_REJECT":
      case "SPREAD_REJECT":
      case "BEACHHEAD_ERROR":
        this.ingestFailure(eventType, payload, timestamp);
        break;
      case "BEACHHEAD_ACCEPTED":
        this.ingestAccepted(payload, timestamp);
        break;
      case "DEX_PRICE_UPDATE":
        // Future: track DEX price feeds for cross-rail correlation
        break;
      default:
        // Absorb everything — even events we don't classify yet
        break;
    }
  }

  /**
   * Ingest execution event — the core intelligence data point.
   */
  private ingestExecution(
    payload: NonNullable<CorpusEvent["payload"]>,
    timestamp: string,
  ): void {
    const buyEx = payload.buyExchange || "";
    const sellEx = payload.sellExchange || "";
    const token = payload.token || payload.pair?.split("/")[0] || "";
    const spreadBps = payload.grossSpreadBps || 0;
    const pnl = payload.realizedPnl || 0;
    const status = payload.status || "";
    const network = payload.network || "";
    const transferTimeMs = payload.transferTimeMs || 0;
    const isSuccess = status === "COMPLETE";

    // 1. Exchange pair accumulation
    if (buyEx && sellEx) {
      const pairKey = `${buyEx}→${sellEx}`;
      const existing = this.exchangePairStats.get(pairKey) || {
        occurrences: 0, totalSpreadBps: 0, totalPnlUsd: 0,
        successCount: 0, failCount: 0,
        firstSeen: timestamp, lastSeen: timestamp,
      };
      existing.occurrences++;
      existing.totalSpreadBps += spreadBps;
      existing.totalPnlUsd += pnl;
      if (isSuccess) existing.successCount++; else existing.failCount++;
      existing.lastSeen = timestamp;
      this.exchangePairStats.set(pairKey, existing);
    }

    // 2. Temporal bucketing
    if (buyEx && sellEx) {
      const dt = new Date(timestamp);
      const hourOfDay = dt.getUTCHours();
      const dayOfWeek = dt.getUTCDay();
      const temporalKey = `${buyEx}→${sellEx}|${token}|h${hourOfDay}|d${dayOfWeek}`;
      const bucket = this.temporalBuckets.get(temporalKey) || {
        hourOfDay, dayOfWeek,
        exchangePair: `${buyEx}→${sellEx}`,
        token,
        occurrences: 0, avgSpreadBps: 0, totalPnlUsd: 0,
        successCount: 0, failCount: 0,
      };
      bucket.occurrences++;
      bucket.avgSpreadBps = ((bucket.avgSpreadBps * (bucket.occurrences - 1)) + spreadBps) / bucket.occurrences;
      bucket.totalPnlUsd += pnl;
      if (isSuccess) bucket.successCount++; else bucket.failCount++;
      this.temporalBuckets.set(temporalKey, bucket);
    }

    // 3. Token-route accumulation
    if (token && buyEx && sellEx) {
      const tokenKey = `${token}|${buyEx}→${sellEx}`;
      const existing = this.tokenRouteStats.get(tokenKey) || {
        occurrences: 0, totalSpreadBps: 0, totalPnlUsd: 0,
        successCount: 0, failCount: 0,
        firstSeen: timestamp, lastSeen: timestamp,
      };
      existing.occurrences++;
      existing.totalSpreadBps += spreadBps;
      existing.totalPnlUsd += pnl;
      if (isSuccess) existing.successCount++; else existing.failCount++;
      existing.lastSeen = timestamp;
      this.tokenRouteStats.set(tokenKey, existing);
    }

    // 4. Network efficiency
    if (network) {
      const netKey = `${network}|${buyEx}→${sellEx}`;
      const existing = this.networkStats.get(netKey) || {
        occurrences: 0, totalTransferTimeMs: 0,
        successCount: 0, failCount: 0,
        firstSeen: timestamp, lastSeen: timestamp,
      };
      existing.occurrences++;
      if (transferTimeMs > 0) existing.totalTransferTimeMs += transferTimeMs;
      if (isSuccess) existing.successCount++; else existing.failCount++;
      existing.lastSeen = timestamp;
      this.networkStats.set(netKey, existing);
    }
  }

  /**
   * Ingest failure events — understanding failure = understanding the battlefield.
   */
  private ingestFailure(
    eventType: string,
    payload: NonNullable<CorpusEvent["payload"]>,
    timestamp: string,
  ): void {
    const buyEx = payload.buyExchange || "";
    const sellEx = payload.sellExchange || "";
    const failKey = `${eventType}|${buyEx}→${sellEx}`;

    const existing = this.failureStats.get(failKey) || {
      occurrences: 0, reasons: {},
      firstSeen: timestamp, lastSeen: timestamp,
    };
    existing.occurrences++;
    existing.lastSeen = timestamp;

    const reason = (payload.status as string) || eventType;
    existing.reasons[reason] = (existing.reasons[reason] || 0) + 1;

    this.failureStats.set(failKey, existing);
  }

  /**
   * Ingest accepted-but-not-yet-executed events.
   */
  private ingestAccepted(
    payload: NonNullable<CorpusEvent["payload"]>,
    _timestamp: string,
  ): void {
    // Track opportunity flow rate — accepted vs executed
    // Future: use this to measure latency (accepted → first execution)
    void payload;
  }

  /**
   * Start periodic analysis — extract patterns from accumulated data.
   */
  startAnalysis(): void {
    if (this.analysisTimer) return;

    // Run first analysis after a brief delay (let corpus load first)
    setTimeout(() => this.runAnalysis(), 10000);

    this.analysisTimer = setInterval(() => this.runAnalysis(), ANALYSIS_INTERVAL_MS);
    console.log(`[BRIGHTON] Pattern analysis started — interval=${ANALYSIS_INTERVAL_MS}ms`);
  }

  stopAnalysis(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
  }

  /**
   * Run full analysis cycle — extract patterns from all accumulated data.
   */
  private runAnalysis(): void {
    this.analysisCount++;
    this.lastAnalysisAt = new Date().toISOString();
    const startPatternCount = this.patterns.size;

    // 1. Exchange pair patterns
    for (const [pairKey, stats] of this.exchangePairStats) {
      if (stats.occurrences < 1) continue;

      const patternId = `EXCHANGE_PAIR_ALPHA|${pairKey}`;
      const { confidence, confidenceScore } = this.scorer.scoreFromOccurrences(stats.occurrences);
      const avgSpread = stats.totalSpreadBps / stats.occurrences;
      const avgPnl = stats.totalPnlUsd / stats.occurrences;
      const successRate = stats.occurrences > 0
        ? stats.successCount / (stats.successCount + stats.failCount) : 0;

      this.patterns.set(patternId, {
        id: patternId,
        type: "EXCHANGE_PAIR_ALPHA",
        description: `${pairKey}: ${stats.occurrences} trades, avg ${avgSpread.toFixed(0)} bps spread, ${(successRate * 100).toFixed(0)}% success`,
        trigger: { exchangePair: pairKey },
        evidence: {
          occurrences: stats.occurrences,
          firstSeen: stats.firstSeen,
          lastSeen: stats.lastSeen,
          avgSpreadBps: Math.round(avgSpread),
          avgPnlUsd: Math.round(avgPnl * 100) / 100,
          successRate: Math.round(successRate * 1000) / 1000,
        },
        confidence,
        confidenceScore,
        updatedAt: new Date().toISOString(),
        active: true,
      });
    }

    // 2. Temporal window patterns (only extract when we have enough data)
    for (const [key, bucket] of this.temporalBuckets) {
      if (bucket.occurrences < 3) continue; // Need at least 3 in same time slot

      const patternId = `TEMPORAL_WINDOW|${key}`;
      const { confidence, confidenceScore } = this.scorer.scoreFromOccurrences(bucket.occurrences);
      const successRate = bucket.occurrences > 0
        ? bucket.successCount / (bucket.successCount + bucket.failCount) : 0;

      this.patterns.set(patternId, {
        id: patternId,
        type: "TEMPORAL_WINDOW",
        description: `${bucket.exchangePair} ${bucket.token} — hour=${bucket.hourOfDay} UTC, day=${bucket.dayOfWeek}: ${bucket.occurrences} trades, avg ${bucket.avgSpreadBps.toFixed(0)} bps`,
        trigger: {
          exchangePair: bucket.exchangePair,
          token: bucket.token,
          hourOfDay: bucket.hourOfDay,
          dayOfWeek: bucket.dayOfWeek,
        },
        evidence: {
          occurrences: bucket.occurrences,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          avgSpreadBps: Math.round(bucket.avgSpreadBps),
          avgPnlUsd: Math.round(bucket.totalPnlUsd / bucket.occurrences * 100) / 100,
          successRate: Math.round(successRate * 1000) / 1000,
        },
        confidence,
        confidenceScore,
        updatedAt: new Date().toISOString(),
        active: true,
      });
    }

    // 3. Token specialist patterns
    for (const [tokenKey, stats] of this.tokenRouteStats) {
      if (stats.occurrences < 2) continue;
      const [token, route] = tokenKey.split("|");

      const patternId = `TOKEN_SPECIALIST|${tokenKey}`;
      const { confidence, confidenceScore } = this.scorer.scoreFromOccurrences(stats.occurrences);
      const avgSpread = stats.totalSpreadBps / stats.occurrences;
      const avgPnl = stats.totalPnlUsd / stats.occurrences;
      const successRate = stats.occurrences > 0
        ? stats.successCount / (stats.successCount + stats.failCount) : 0;

      this.patterns.set(patternId, {
        id: patternId,
        type: "TOKEN_SPECIALIST",
        description: `${token} on ${route}: ${stats.occurrences} trades, avg ${avgSpread.toFixed(0)} bps, $${avgPnl.toFixed(2)} avg P&L`,
        trigger: {
          token,
          exchangePair: route,
        },
        evidence: {
          occurrences: stats.occurrences,
          firstSeen: stats.firstSeen,
          lastSeen: stats.lastSeen,
          avgSpreadBps: Math.round(avgSpread),
          avgPnlUsd: Math.round(avgPnl * 100) / 100,
          successRate: Math.round(successRate * 1000) / 1000,
        },
        confidence,
        confidenceScore,
        updatedAt: new Date().toISOString(),
        active: true,
      });
    }

    // 4. Network efficiency patterns
    for (const [netKey, stats] of this.networkStats) {
      if (stats.occurrences < 2) continue;
      const [network, route] = netKey.split("|");

      const patternId = `NETWORK_EFFICIENCY|${netKey}`;
      const { confidence, confidenceScore } = this.scorer.scoreFromOccurrences(stats.occurrences);
      const avgTransferTime = stats.totalTransferTimeMs / stats.occurrences;
      const successRate = stats.occurrences > 0
        ? stats.successCount / (stats.successCount + stats.failCount) : 0;

      this.patterns.set(patternId, {
        id: patternId,
        type: "NETWORK_EFFICIENCY",
        description: `${network} on ${route}: avg ${(avgTransferTime / 1000).toFixed(0)}s transfer, ${(successRate * 100).toFixed(0)}% success`,
        trigger: { exchangePair: route },
        evidence: {
          occurrences: stats.occurrences,
          firstSeen: stats.firstSeen,
          lastSeen: stats.lastSeen,
          avgSpreadBps: 0,
          avgPnlUsd: 0,
          successRate: Math.round(successRate * 1000) / 1000,
          avgTransferTimeMs: Math.round(avgTransferTime),
        },
        confidence,
        confidenceScore,
        updatedAt: new Date().toISOString(),
        active: true,
      });
    }

    // 5. Failure correlation patterns
    for (const [failKey, stats] of this.failureStats) {
      if (stats.occurrences < 3) continue;
      const [reason, route] = failKey.split("|");

      const patternId = `FAILURE_CORRELATION|${failKey}`;
      const { confidence, confidenceScore } = this.scorer.scoreFromOccurrences(stats.occurrences);
      const topReason = Object.entries(stats.reasons)
        .sort((a, b) => b[1] - a[1])[0];

      this.patterns.set(patternId, {
        id: patternId,
        type: "FAILURE_CORRELATION",
        description: `${reason} on ${route}: ${stats.occurrences} failures, top reason: ${topReason?.[0] || "unknown"} (${topReason?.[1] || 0}x)`,
        trigger: { exchangePair: route },
        evidence: {
          occurrences: stats.occurrences,
          firstSeen: stats.firstSeen,
          lastSeen: stats.lastSeen,
          avgSpreadBps: 0,
          avgPnlUsd: 0,
          successRate: 0,
        },
        confidence,
        confidenceScore,
        updatedAt: new Date().toISOString(),
        active: true,
      });
    }

    const newPatterns = this.patterns.size - startPatternCount;
    const byConfidence = this.getConfidenceDistribution();

    console.log(
      `[BRIGHTON] Analysis #${this.analysisCount} — ` +
      `${this.patterns.size} patterns (${newPatterns} new), ` +
      `events=${this.eventsProcessed}, ` +
      `DOCTRINE=${byConfidence.DOCTRINE || 0} ACTION=${byConfidence.ACTIONABLE || 0} ` +
      `HYPO=${byConfidence.HYPOTHESIS || 0} ANEC=${byConfidence.ANECDOTE || 0}`,
    );
  }

  /**
   * Get all patterns, optionally filtered.
   */
  getPatterns(opts?: {
    type?: PatternType;
    minConfidence?: ConfidenceLevel;
    activeOnly?: boolean;
    limit?: number;
  }): Pattern[] {
    let results = Array.from(this.patterns.values());

    if (opts?.type) {
      results = results.filter(p => p.type === opts.type);
    }

    if (opts?.activeOnly) {
      results = results.filter(p => p.active);
    }

    if (opts?.minConfidence) {
      const levels: ConfidenceLevel[] = ["ANECDOTE", "HYPOTHESIS", "ACTIONABLE", "DOCTRINE"];
      const minIdx = levels.indexOf(opts.minConfidence);
      results = results.filter(p => levels.indexOf(p.confidence) >= minIdx);
    }

    // Sort by confidence score descending
    results.sort((a, b) => b.confidenceScore - a.confidenceScore);

    if (opts?.limit) {
      results = results.slice(0, opts.limit);
    }

    return results;
  }

  /**
   * Get confidence distribution.
   */
  getConfidenceDistribution(): Record<ConfidenceLevel, number> {
    const dist: Record<ConfidenceLevel, number> = {
      ANECDOTE: 0,
      HYPOTHESIS: 0,
      ACTIONABLE: 0,
      DOCTRINE: 0,
    };

    for (const pattern of this.patterns.values()) {
      dist[pattern.confidence]++;
    }

    return dist;
  }

  /**
   * Get Brighton's state summary.
   */
  getState(): BrightonState {
    const mode = this.eventsProcessed === 0
      ? "COLD_START"
      : this.patterns.size === 0
        ? "ACCUMULATING"
        : this.getConfidenceDistribution().ACTIONABLE > 0
          ? "ACTIVE"
          : "PATTERN_DETECTION";

    const byType: Record<string, number> = {};
    for (const pattern of this.patterns.values()) {
      byType[pattern.type] = (byType[pattern.type] || 0) + 1;
    }

    return {
      mode,
      corpusEventsProcessed: this.eventsProcessed,
      patternsDetected: this.patterns.size,
      patternsByConfidence: this.getConfidenceDistribution(),
      patternsByType: byType,
      oldestEventProcessed: this.oldestProcessed,
      newestEventProcessed: this.newestProcessed,
      lastAnalysisAt: this.lastAnalysisAt,
      analysisCount: this.analysisCount,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  getEventsProcessed(): number {
    return this.eventsProcessed;
  }

  getPatternCount(): number {
    return this.patterns.size;
  }
}
