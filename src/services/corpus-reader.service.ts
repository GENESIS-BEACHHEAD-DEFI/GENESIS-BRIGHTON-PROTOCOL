/**
 * GENESIS-BRIGHTON-PROTOCOL — Corpus Reader Service
 *
 * Reads GTC corpus files (JSONL) and feeds events to the pattern detector.
 * Two modes:
 *   1. Historical scan: on startup, reads all existing corpus files
 *   2. Live tail: periodically checks for new events in today's file
 *
 * The newborn brain — absorbing everything from the moment it's born.
 */

import fs from "fs";
import path from "path";
import type { CorpusEvent } from "../types";

const GTC_DATA_DIR = process.env.GTC_DATA_DIR || "/gtc-data";
const GTC_URL = process.env.GTC_URL || "http://genesis-beachhead-gtc:8650";
const TAIL_INTERVAL_MS = parseInt(process.env.BRIGHTON_TAIL_INTERVAL_MS || "30000", 10); // 30s default

export class CorpusReaderService {
  private processedLines: Map<string, number> = new Map(); // file → last line read
  private totalEventsRead = 0;
  private tailTimer: ReturnType<typeof setInterval> | null = null;
  private eventCallback: ((event: CorpusEvent) => void) | null = null;
  private oldestEvent: string | null = null;
  private newestEvent: string | null = null;

  /**
   * Register callback for new events.
   * Brighton's brain registers here to receive every event.
   */
  onEvent(callback: (event: CorpusEvent) => void): void {
    this.eventCallback = callback;
  }

  /**
   * Historical scan — read all existing corpus files.
   * The newborn brain catching up on everything that happened before it was born.
   */
  async scanHistorical(): Promise<number> {
    let totalRead = 0;

    // Method 1: Read from GTC data volume (shared Docker volume)
    if (fs.existsSync(GTC_DATA_DIR)) {
      const files = fs.readdirSync(GTC_DATA_DIR)
        .filter(f => f.startsWith("beachhead-corpus-") && f.endsWith(".jsonl"))
        .sort(); // chronological order

      console.log(`[BRIGHTON] Historical scan — ${files.length} corpus files found in ${GTC_DATA_DIR}`);

      for (const file of files) {
        const count = this.readCorpusFile(path.join(GTC_DATA_DIR, file));
        totalRead += count;
        console.log(`[BRIGHTON] Scanned ${file} — ${count} events`);
      }
    } else {
      console.log(`[BRIGHTON] GTC data directory not found: ${GTC_DATA_DIR}`);
      console.log(`[BRIGHTON] Will attempt API fallback...`);

      // Method 2: Fetch from GTC API
      totalRead = await this.fetchFromGtcApi();
    }

    console.log(`[BRIGHTON] Historical scan complete — ${totalRead} total events absorbed`);
    return totalRead;
  }

  /**
   * Start live tail — periodically check for new events.
   * The brain never stops absorbing.
   */
  startTail(): void {
    if (this.tailTimer) return;

    this.tailTimer = setInterval(() => {
      this.tailLatest();
    }, TAIL_INTERVAL_MS);

    console.log(`[BRIGHTON] Live tail started — interval=${TAIL_INTERVAL_MS}ms`);
  }

  stopTail(): void {
    if (this.tailTimer) {
      clearInterval(this.tailTimer);
      this.tailTimer = null;
    }
  }

  /**
   * Read new events from today's corpus file.
   */
  private tailLatest(): void {
    const date = new Date().toISOString().slice(0, 10);
    const filePath = path.join(GTC_DATA_DIR, `beachhead-corpus-${date}.jsonl`);

    if (!fs.existsSync(filePath)) return;

    const previousLine = this.processedLines.get(filePath) || 0;
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim().length > 0);

    if (lines.length <= previousLine) return;

    const newLines = lines.slice(previousLine);
    let newCount = 0;

    for (const line of newLines) {
      try {
        const event = JSON.parse(line) as CorpusEvent;
        this.emitEvent(event);
        newCount++;
      } catch {
        // Skip malformed lines
      }
    }

    this.processedLines.set(filePath, lines.length);

    if (newCount > 0) {
      console.log(`[BRIGHTON] Tail absorbed ${newCount} new events from ${date}`);
    }
  }

  /**
   * Read all events from a JSONL corpus file.
   */
  private readCorpusFile(filePath: string): number {
    if (!fs.existsSync(filePath)) return 0;

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim().length > 0);
    let count = 0;

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as CorpusEvent;
        this.emitEvent(event);
        count++;
      } catch {
        // Skip malformed lines
      }
    }

    this.processedLines.set(filePath, lines.length);
    return count;
  }

  /**
   * Fallback: fetch corpus from GTC API when volume not available.
   */
  private async fetchFromGtcApi(): Promise<number> {
    let totalRead = 0;

    try {
      // Get dashboard to find available dates
      const dashRes = await fetch(`${GTC_URL}/dashboard`, {
        signal: AbortSignal.timeout(10000),
      });
      const dashboard = await dashRes.json() as {
        corpus?: { files?: string[] };
      };

      const files = dashboard.corpus?.files || [];
      console.log(`[BRIGHTON] GTC API reports ${files.length} corpus files`);

      for (const file of files) {
        // Extract date from filename: beachhead-corpus-2026-03-21.jsonl → 2026-03-21
        const match = file.match(/(\d{4}-\d{2}-\d{2})/);
        if (!match) continue;

        try {
          const res = await fetch(`${GTC_URL}/corpus/${match[1]}`, {
            signal: AbortSignal.timeout(30000),
          });
          const data = await res.json() as { events?: CorpusEvent[] };
          const events = data.events || [];

          for (const event of events) {
            this.emitEvent(event);
            totalRead++;
          }

          console.log(`[BRIGHTON] API fetched ${events.length} events for ${match[1]}`);
        } catch (err) {
          console.log(`[BRIGHTON] API fetch failed for ${match[1]}: ${err instanceof Error ? err.message : "Unknown"}`);
        }
      }
    } catch (err) {
      console.log(`[BRIGHTON] GTC API unreachable: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    return totalRead;
  }

  /**
   * Emit event to Brighton's brain.
   */
  private emitEvent(event: CorpusEvent): void {
    this.totalEventsRead++;

    const timestamp = event.receivedAt || "";
    if (timestamp) {
      if (!this.oldestEvent || timestamp < this.oldestEvent) {
        this.oldestEvent = timestamp;
      }
      if (!this.newestEvent || timestamp > this.newestEvent) {
        this.newestEvent = timestamp;
      }
    }

    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  getTotalEventsRead(): number {
    return this.totalEventsRead;
  }

  getOldestEvent(): string | null {
    return this.oldestEvent;
  }

  getNewestEvent(): string | null {
    return this.newestEvent;
  }
}
