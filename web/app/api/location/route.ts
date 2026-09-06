import { json } from '@/lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: 'Valid coordinates are required.' }, { status: 400 });
  try {
    const upstream = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lng}`, {
      headers: { 'user-agent': 'THENGA-GRID/2.0 (neighbourhood commerce location lookup)', 'accept-language': 'en' },
    });
    if (!upstream.ok) throw new Error(`Geocoder returned ${upstream.status}`);
    const data = await upstream.json<Record<string, unknown>>();
    return json({ displayName: data.display_name ?? 'Your current area', address: data.address ?? {} }, {
      headers: { 'cache-control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('Reverse geocoding failed', error);
    return json({ displayName: 'Your current area', address: {} });
  }
}
