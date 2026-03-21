/**
 * GENESIS-BRIGHTON-PROTOCOL — Confidence Scorer Service
 *
 * Commander's doctrine:
 *   1x  = ANECDOTE     — interesting but unverified
 *   5x  = HYPOTHESIS   — emerging pattern, monitor closely
 *   20x = ACTIONABLE   — reliable enough for automated decisions
 *   50x = DOCTRINE     — proven pattern, weaponise
 *
 * Confidence decays over time — patterns must be continuously reinforced.
 * A pattern not seen for 7 days drops one level.
 * A pattern not seen for 30 days becomes inactive.
 *
 * Cross-rail: Not siloed. Crypto patterns may reveal forex/gold correlations.
 */

import type { ConfidenceLevel } from "../types";

const DECAY_CHECK_INTERVAL_MS = parseInt(process.env.BRIGHTON_DECAY_CHECK_MS || "3600000", 10); // 1 hour
const DECAY_THRESHOLD_DAYS = parseInt(process.env.BRIGHTON_DECAY_DAYS || "7", 10);
const INACTIVE_THRESHOLD_DAYS = parseInt(process.env.BRIGHTON_INACTIVE_DAYS || "30", 10);

export interface ScoredPattern {
  occurrences: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  lastSeen: number;  // timestamp
  active: boolean;
}

export class ConfidenceScorerService {
  private decayTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Calculate confidence level from occurrence count.
   * Commander's doctrine — the scoring table.
   */
  scoreFromOccurrences(occurrences: number): { confidence: ConfidenceLevel; confidenceScore: number } {
    if (occurrences >= 50) {
      return { confidence: "DOCTRINE", confidenceScore: Math.min(100, 70 + occurrences * 0.6) };
    }
    if (occurrences >= 20) {
      return { confidence: "ACTIONABLE", confidenceScore: 50 + ((occurrences - 20) / 30) * 20 };
    }
    if (occurrences >= 5) {
      return { confidence: "HYPOTHESIS", confidenceScore: 20 + ((occurrences - 5) / 15) * 30 };
    }
    return { confidence: "ANECDOTE", confidenceScore: Math.max(1, occurrences * 5) };
  }

  /**
   * Apply time decay to a pattern.
   * Intelligence ages — patterns must be continuously reinforced.
   */
  applyDecay(pattern: ScoredPattern): ScoredPattern {
    const daysSinceLastSeen = (Date.now() - pattern.lastSeen) / (1000 * 60 * 60 * 24);

    if (daysSinceLastSeen >= INACTIVE_THRESHOLD_DAYS) {
      return { ...pattern, active: false, confidenceScore: Math.max(1, pattern.confidenceScore * 0.3) };
    }

    if (daysSinceLastSeen >= DECAY_THRESHOLD_DAYS) {
      const decayFactor = 1 - ((daysSinceLastSeen - DECAY_THRESHOLD_DAYS) / INACTIVE_THRESHOLD_DAYS) * 0.5;
      const decayedScore = pattern.confidenceScore * Math.max(0.3, decayFactor);
      const { confidence } = this.scoreFromOccurrences(
        this.effectiveOccurrences(pattern.occurrences, decayedScore),
      );
      return { ...pattern, confidence, confidenceScore: decayedScore };
    }

    return pattern;
  }

  /**
   * Reverse-map a decayed confidence score to effective occurrences.
   */
  private effectiveOccurrences(rawOccurrences: number, decayedScore: number): number {
    if (decayedScore >= 70) return Math.max(50, rawOccurrences);
    if (decayedScore >= 50) return Math.max(20, Math.min(49, rawOccurrences));
    if (decayedScore >= 20) return Math.max(5, Math.min(19, rawOccurrences));
    return Math.min(4, rawOccurrences);
  }

  /**
   * Check if a pattern is strong enough to be actionable.
   * Used by future DARPA/Swarm systems to decide whether to act.
   */
  isActionable(pattern: ScoredPattern): boolean {
    return pattern.active && pattern.confidenceScore >= 50;
  }

  /**
   * Check if a pattern is doctrine-level (proven, weaponise).
   */
  isDoctrine(pattern: ScoredPattern): boolean {
    return pattern.active && pattern.confidenceScore >= 70;
  }

  startDecayCheck(patterns: Map<string, ScoredPattern>): void {
    if (this.decayTimer) return;

    this.decayTimer = setInterval(() => {
      let decayed = 0;
      let deactivated = 0;

      for (const [id, pattern] of patterns) {
        const updated = this.applyDecay(pattern);
        if (updated.confidenceScore !== pattern.confidenceScore) {
          patterns.set(id, updated);
          decayed++;
        }
        if (!updated.active && pattern.active) {
          deactivated++;
        }
      }

      if (decayed > 0 || deactivated > 0) {
        console.log(
          `[BRIGHTON] Decay check — ${decayed} patterns decayed, ${deactivated} deactivated`,
        );
      }
    }, DECAY_CHECK_INTERVAL_MS);

    console.log(`[BRIGHTON] Confidence decay checker started — interval=${DECAY_CHECK_INTERVAL_MS}ms`);
  }

  stopDecayCheck(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = null;
    }
  }
}
