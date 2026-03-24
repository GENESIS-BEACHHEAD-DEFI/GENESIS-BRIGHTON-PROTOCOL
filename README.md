# GENESIS-BRIGHTON-PROTOCOL — Silent Observer Intelligence Loop

**Never-Ending Pattern Detection from GTC Corpus**

Port: **8670**

> "A newborn brain -- constantly learning, building, seeing new horizons."

---

## What It Does

1. **Corpus Absorption** -- reads every event from the GTC telemetry corpus. Two modes: historical scan (all existing corpus files on startup) and live tail (periodic check every 30 seconds for new events). Falls back to GTC API when shared volume is unavailable.
2. **Multi-Dimensional Pattern Detection** -- extracts 5 pattern types from accumulated data: exchange pair alpha (which routes are consistently profitable), temporal windows (time-of-day/day-of-week spread patterns), token specialists (which tokens are reliable on which routes), network efficiency (transfer time and success rates by network), and failure correlations (what conditions predict failures).
3. **Confidence Scoring** -- Commander's doctrine scoring table. 1x occurrence = ANECDOTE (interesting but unverified), 5x = HYPOTHESIS (emerging, monitor closely), 20x = ACTIONABLE (reliable for automated decisions), 50x = DOCTRINE (proven pattern, weaponise). Confidence decays over time: 7 days without observation drops one level, 30 days marks inactive.
4. **DOCTRINE Forwarding** -- auto-forwards DOCTRINE-level patterns to Whiteboard every 5 minutes as source="BRIGHTON", category="PATTERN". Deduplicated so each pattern is only forwarded once.
5. **Intelligence Briefing** -- structured output for human consumption: best exchange pairs by success rate, best tokens, best temporal windows, failure hotspots, and all DOCTRINE entries.
6. **Direct Ingest** -- accepts events directly via POST /ingest, bypassing GTC file read. Allows other services to push events to Brighton in real time.
7. **Silent Observer** -- v0.1 takes NO action. Intelligence only. Future versions will feed patterns to DARPA for mission planning and Academy for operator training.

---

## Architecture

| File | Purpose | Lines |
|------|---------|-------|
| `src/index.ts` | Express app, boot sequence (historical scan -> live tail -> analysis), 7 endpoints, DOCTRINE forwarding | 266 |
| `src/types.ts` | CorpusEvent, Pattern, 8 PatternTypes, 4 ConfidenceLevels, BrightonState, TemporalBucket | 106 |
| `src/services/corpus-reader.service.ts` | GTC corpus JSONL reader: historical scan + live tail. API fallback. Event callback system | 228 |
| `src/services/confidence-scorer.service.ts` | Occurrence-based scoring table, time decay (7d drop, 30d inactive), decay check loop | 134 |
| `src/services/pattern-detector.service.ts` | Analytical brain: 5 accumulation buckets, 5-type pattern extraction in runAnalysis(), confidence distribution | 541 |
| `package.json` | genesis-brighton-protocol v0.1.0, express ^4.18.2, typescript ^5.3.3 | 19 |
| `Dockerfile` | node:20.20.0-slim, EXPOSE 8670, mkdir /app/data | 9 |

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Status, mode (COLD_START/ACCUMULATING/PATTERN_DETECTION/ACTIVE), events processed, confidence distribution |
| GET | `/state` | Full Brighton state: top patterns, doctrine, actionable, hypotheses, corpus stats |
| GET | `/patterns` | Query patterns with filters: ?type, ?minConfidence, ?activeOnly, ?limit |
| GET | `/patterns/:type` | Active patterns filtered by type (EXCHANGE_PAIR_ALPHA, TEMPORAL_WINDOW, etc.) |
| POST | `/ingest` | Direct event ingestion (bypass GTC file read) |
| GET | `/intelligence` | Intelligence briefing: best pairs, tokens, times, failure hotspots, doctrine |

---

## Periodic Loops

| Loop | Default Interval | Purpose |
|------|-----------------|---------|
| Live Tail | 30s | Check for new events in today's GTC corpus file |
| Pattern Analysis | 5 min (300000ms) | Extract patterns from all accumulated data buckets |
| Confidence Decay | 1 hr (3600000ms) | Apply time decay to stale patterns, deactivate after 30 days |
| DOCTRINE Forward | 5 min (300000ms) | Forward DOCTRINE-level patterns to Whiteboard |

---

## Pattern Types

| Type | Minimum Occurrences | What It Detects |
|------|---------------------|-----------------|
| `EXCHANGE_PAIR_ALPHA` | 1 | Consistent spread on a specific exchange pair route |
| `TEMPORAL_WINDOW` | 3 | Spreads appear at predictable times of day/week |
| `TOKEN_SPECIALIST` | 2 | Specific tokens reliably profitable on specific routes |
| `NETWORK_EFFICIENCY` | 2 | Transfer networks that are faster/cheaper for certain routes |
| `FAILURE_CORRELATION` | 3 | Failures correlate with conditions (time, exchange, token) |

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8670` | HTTP listen port |
| `GTC_DATA_DIR` | `/gtc-data` | Shared Docker volume path for GTC corpus JSONL files |
| `GTC_URL` | `http://genesis-beachhead-gtc:8650` | GTC API URL for fallback corpus fetch |
| `WHITEBOARD_URL` | (none) | Whiteboard URL for DOCTRINE pattern forwarding |
| `BRIGHTON_TAIL_INTERVAL_MS` | `30000` | Live tail check interval |
| `BRIGHTON_ANALYSIS_INTERVAL_MS` | `300000` | Pattern analysis cycle interval |
| `BRIGHTON_DECAY_CHECK_MS` | `3600000` | Confidence decay check interval |
| `BRIGHTON_DECAY_DAYS` | `7` | Days without observation before confidence drops one level |
| `BRIGHTON_INACTIVE_DAYS` | `30` | Days without observation before pattern marked inactive |

---

## Integration

| Service | Direction | Purpose |
|---------|-----------|---------|
| GTC | READ | Absorbs every event from GTC corpus (file volume or API) |
| Whiteboard | WRITE | Forwards DOCTRINE-level patterns as source="BRIGHTON" |
| Academy | FUTURE | Will feed patterns for operator training curriculum |
| DARPA | FUTURE | Will feed actionable intelligence for mission planning |

---

## Boot Sequence

1. **Historical scan** -- reads all existing GTC corpus files (JSONL) in chronological order, absorbing everything that happened before Brighton was born
2. **Live tail** -- starts periodic check (every 30s) for new events in today's corpus file
3. **Pattern analysis** -- begins periodic analysis cycle (every 5 min), extracting patterns from accumulated data
4. **Brain is active** -- continuously absorbing, detecting, scoring. The cold start warms up.

---

## Confidence Doctrine

| Occurrences | Level | Meaning |
|-------------|-------|---------|
| 1-4 | ANECDOTE | Interesting but unverified |
| 5-19 | HYPOTHESIS | Emerging pattern, monitor closely |
| 20-49 | ACTIONABLE | Reliable enough for automated decisions |
| 50+ | DOCTRINE | Proven pattern, weaponise |

---

## Current State

- BUILT and operational (2026-03-22)
- v0.1 = SILENT OBSERVER mode. Intelligence only, no action taken.
- Enhanced with DOCTRINE auto-forwarding to Whiteboard every 5 minutes
- 8 pattern types defined, 5 actively extracted in analysis cycle
- Confidence decay active: stale patterns fade, fresh patterns rise
- Docker: port 8670, rail1_shared_network + whiteboard_network
- Cross-rail from day one: crypto patterns may reveal forex/gold correlations

---

## Future Editions

1. DARPA integration -- feed ACTIONABLE and DOCTRINE patterns directly to DARPA for automated mission planning
2. Academy training feed -- push pattern intelligence to Academy for operator curriculum updates
3. SPREAD_DECAY detection -- measure how fast spreads close to detect stale data signals
4. EXCHANGE_DARK_PATTERN detection -- identify exchange downtime patterns and maintenance windows
5. TRANSFER_TIME_PATTERN extraction -- predictable transfer times by network/exchange for execution optimisation
6. Cross-rail correlation -- detect patterns across crypto/forex/gold rails as they come online
7. GPU acceleration -- RAPIDS cuML for pattern clustering, TensorRT for confidence model inference (Phase 2+)

---

## Rail Deployment

| Rail | Status | Notes |
|------|--------|-------|
| Rail 1 (Cash Rail) | BUILT | Absorbing CEX execution telemetry. Silent observer mode. |
| Beachhead (DeFi) | BUILT | Absorbing DEX price/execution events from GTC. |
| Rail 3+ | GOD / Ray Trace | Same brain, different corpus. Model T19 plug-and-play. |
