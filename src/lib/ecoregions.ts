/**
 * Level I/II/III names for a Level III ecoregion code.
 *
 * The ZIP endpoint returns only the Level III code and name, so the wider levels are
 * resolved here from a table generated out of the bundled Level III layer
 * (static/geodata/ecoregions.json). The code from the API is the authority; this only
 * supplies the labels for it.
 */
import levels from './data/ecoregion-levels.json';

export interface EcoregionLevels {
  l1Code: string;
  l1Name: string;
  l2Code: string;
  l2Name: string;
  l3Code: string;
  l3Name: string;
}

const LEVELS: Record<string, Omit<EcoregionLevels, 'l3Code'>> = levels;

/**
 * Splits "8.1.7" into its Level I ("8") and Level II ("8.1") codes. Used when a code
 * isn't in the table, so the hierarchy still renders even without names.
 */
function parentCodes(code: string): { l1Code: string; l2Code: string } {
  const parts = code.split('.');
  return { l1Code: parts[0] ?? code, l2Code: parts.slice(0, 2).join('.') };
}

/**
 * Resolves the three levels for a Level III code. `apiName` is the endpoint's own
 * Level III name, used only as a fallback — the bundled layer's spelling wins, since
 * the API truncates some names (8.3.1 comes back as "Northern Piedmon").
 */
export function resolveEcoregionLevels(
  code: string | undefined,
  apiName?: string
): EcoregionLevels | null {
  if (!code) return null;

  const known = LEVELS[code];
  if (known) return { ...known, l3Code: code };

  // Code outside the bundled US layer: show the hierarchy without the wider names.
  const { l1Code, l2Code } = parentCodes(code);
  return {
    l1Code,
    l1Name: '',
    l2Code,
    l2Name: '',
    l3Code: code,
    l3Name: apiName ?? ''
  };
}
