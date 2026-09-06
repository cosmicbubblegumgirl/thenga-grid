import { json } from '@/lib/auth';

type Element = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ shops: [] });
  const query = `[out:json][timeout:12];(nwr["shop"~"convenience|supermarket|general|greengrocer|bakery"](around:3000,${lat},${lng}););out center tags 40;`;
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', 'user-agent': 'THENGA-GRID/2.0 neighbourhood shop discovery' },
      body: new URLSearchParams({ data: query }),
    });
    if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
    const data = await response.json<{ elements?: Element[] }>();
    const shops = (data.elements ?? []).map((element) => ({
      id: `osm_${element.id}`,
      name: element.tags?.name || element.tags?.brand || 'Local shop',
      address: [element.tags?.['addr:housenumber'], element.tags?.['addr:street'], element.tags?.['addr:suburb']].filter(Boolean).join(' ') || 'Nearby',
      latitude: element.lat ?? element.center?.lat,
      longitude: element.lon ?? element.center?.lon,
      category: element.tags?.shop ?? 'convenience',
      openingHours: element.tags?.opening_hours ?? 'Hours not listed',
      phone: element.tags?.phone ?? null,
      source: 'OpenStreetMap',
    })).filter((shop) => Number.isFinite(shop.latitude) && Number.isFinite(shop.longitude));
    return json({ shops }, { headers: { 'cache-control': 'public, max-age=1800' } });
  } catch (error) {
    console.error('OpenStreetMap shop lookup failed', error);
    return json({ shops: [] });
  }
}
