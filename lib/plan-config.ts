/**
 * Plan configuration with time-gated changes.
 * Effective May 1, 2026 at 00:00 UAE time (April 30, 2026 20:00 UTC):
 *   1. UAE Flag plan is removed
 *   2. Free plan loses "Publish on X" capability
 */

// May 1, 2026 00:00 UAE (UTC+4) = April 30, 2026 20:00 UTC
const CUTOFF_UTC = new Date("2026-04-30T20:00:00Z");

/** Returns true after May 1 2026 00:00 UAE time */
export function isPastMay1(): boolean {
  return new Date() >= CUTOFF_UTC;
}

/** Returns true if the UAE Flag plan should be shown/available */
export function isUAEFlagAvailable(): boolean {
  return !isPastMay1();
}

/** Returns true if the Free plan can publish to X */
export function canFreePublishX(): boolean {
  return !isPastMay1();
}

/** List of free plan names (changes after cutoff) */
export function getFreePlanNames(): string[] {
  return isPastMay1() ? ["Free"] : ["Free", "UAE Flag"];
}
