import { getDb } from '@/db';
import { json } from '@/lib/auth';
import { ensureSeedData } from '@/lib/seed';

type ShopRow = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  openingHours: string;
  rating: number;
  reviewCount: number;
  pickupMinutes: number;
  stepFree: number;
  verified: number;
  isOpen: number;
};

type StockRow = {
  id: string;
  shopId: string;
  productId: string;
  name: string;
  category: string;
  priceCents: number;
  quantity: number;
  updatedAt: number;
};

type DropRow = {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  priceCents: number;
  originalPriceCents: number;
  quantity: number;
  expiresAt: number;
  kind: string;
};

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: Request) {
  try {
    await ensureSeedData();
    const url = new URL(request.url);
    const latitude = Number(url.searchParams.get('lat'));
    const longitude = Number(url.searchParams.get('lng'));
    const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
    const db = getDb();

    const [shopResult, stockResult, dropResult, postResult] = await Promise.all([
      db.prepare(`
        SELECT id, name, description, address, latitude, longitude, phone,
          opening_hours AS openingHours, rating, review_count AS reviewCount,
          pickup_minutes AS pickupMinutes, step_free AS stepFree,
          verified, is_open AS isOpen
        FROM shops WHERE is_open = 1
      `).all<ShopRow>(),
      db.prepare(`
        SELECT inventory.id, inventory.shop_id AS shopId, inventory.product_id AS productId,
          products.name, products.category, inventory.price_cents AS priceCents,
          inventory.quantity, inventory.updated_at AS updatedAt
        FROM inventory JOIN products ON products.id = inventory.product_id
      `).all<StockRow>(),
      db.prepare(`
        SELECT drops.id, drops.shop_id AS shopId, drops.product_id AS productId,
          products.name AS productName, drops.price_cents AS priceCents,
          drops.original_price_cents AS originalPriceCents, drops.quantity,
          drops.expires_at AS expiresAt, drops.kind
        FROM drops JOIN products ON products.id = drops.product_id
        WHERE drops.expires_at > ? AND drops.quantity > 0
      `).bind(Math.floor(Date.now() / 1000)).all<DropRow>(),
      db.prepare(`
        SELECT community_posts.id, community_posts.author_name AS authorName,
          community_posts.body, community_posts.created_at AS createdAt,
          shops.name AS shopName
        FROM community_posts LEFT JOIN shops ON shops.id = community_posts.shop_id
        ORDER BY community_posts.created_at DESC LIMIT 20
      `).all(),
    ]);

    const shops = shopResult.results.map((shop) => {
      const distance = hasLocation ? distanceKm(latitude, longitude, shop.latitude, shop.longitude) : null;
      return {
        ...shop,
        stepFree: Boolean(shop.stepFree),
        verified: Boolean(shop.verified),
        isOpen: Boolean(shop.isOpen),
        distanceKm: distance === null ? null : Number(distance.toFixed(2)),
        inventory: stockResult.results.filter((item) => item.shopId === shop.id),
        drops: dropResult.results.filter((drop) => drop.shopId === shop.id),
      };
    }).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    return json({ shops, community: postResult.results });
  } catch (error) {
    console.error('Shop feed failed', error);
    return json({ error: 'Neighbourhood data is temporarily unavailable.' }, { status: 500 });
  }
}
