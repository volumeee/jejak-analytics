/**
 * Lightweight IP-to-location service.
 * Uses a simple lookup approach — in production, integrate MaxMind GeoLite2.
 * For now, extracts timezone from accept-language / CF-IPCountry headers.
 */

export interface GeoLocation {
  country: string;
  city: string;
}

// Simple country detection from common headers
export function resolveGeoLocation(
  ip: string,
  headers: Record<string, string | string[] | undefined>,
): GeoLocation {
  // Check CloudFlare header
  const cfCountry = getHeader(headers, 'cf-ipcountry');
  if (cfCountry && cfCountry !== 'XX') {
    return { country: cfCountry.toUpperCase(), city: '' };
  }

  // Check Vercel header
  const vercelCountry = getHeader(headers, 'x-vercel-ip-country');
  if (vercelCountry) {
    return {
      country: vercelCountry.toUpperCase(),
      city: getHeader(headers, 'x-vercel-ip-city') || '',
    };
  }

  // Check nginx GeoIP module header
  const geoCountry = getHeader(headers, 'x-geo-country');
  if (geoCountry) {
    return {
      country: geoCountry.toUpperCase(),
      city: getHeader(headers, 'x-geo-city') || '',
    };
  }

  // Fallback: try to detect from timezone
  const timezone = getHeader(headers, 'x-timezone');
  if (timezone) {
    const country = timezoneToCountry(timezone);
    if (country) return { country, city: '' };
  }

  return { country: '', city: '' };
}

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string {
  const val = headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
}

/** Basic timezone → country mapping for common timezones */
function timezoneToCountry(tz: string): string {
  const map: Record<string, string> = {
    'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID',
    'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Bangkok': 'TH',
    'Asia/Ho_Chi_Minh': 'VN', 'Asia/Manila': 'PH', 'Asia/Tokyo': 'JP',
    'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Kolkata': 'IN',
    'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
    'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
    'Europe/Amsterdam': 'NL', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT',
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
    'America/Los_Angeles': 'US', 'America/Sao_Paulo': 'BR',
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
    'Pacific/Auckland': 'NZ',
  };
  return map[tz] || '';
}
