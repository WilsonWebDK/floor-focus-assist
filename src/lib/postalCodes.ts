/**
 * Danish postal code → region mapping.
 * Regions follow the 5 administrative regions of Denmark.
 */
const POSTAL_REGIONS: Record<string, string> = {
  "1": "Region Hovedstaden",
  "2": "Region Hovedstaden",
  "3": "Region Hovedstaden",
  "4": "Region Sjælland",
  "5": "Region Syddanmark",
  "6": "Region Syddanmark",
  "7": "Region Midtjylland",
  "8": "Region Midtjylland",
  "9": "Region Nordjylland",
};

export function isValidDanishPostalCode(code: string): boolean {
  return /^\d{4}$/.test(code) && parseInt(code, 10) >= 800 && parseInt(code, 10) <= 9990;
}

export function getRegionFromPostalCode(code: string): string | null {
  if (!isValidDanishPostalCode(code)) return null;
  const prefix = code.charAt(0);
  return POSTAL_REGIONS[prefix] ?? null;
}
