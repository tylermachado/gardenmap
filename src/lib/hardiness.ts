/**
 * USDA hardiness zone helpers.
 *
 * The ZIP endpoint reports the zone as a bare integer (6), not a half-zone (6b), so the
 * temperature band is derived from the integer rather than read off a polygon: each zone
 * spans 10°F, with zone 1 starting at -60°F.
 */

/** Average annual lowest temperature band for a whole zone, e.g. 6 → "-10 to 0". */
export function zoneTempRange(zone: number): string | null {
  if (!Number.isFinite(zone) || zone < 1 || zone > 13) return null;
  const low = (zone - 1) * 10 - 60;
  return `${low} to ${low + 10}`;
}
