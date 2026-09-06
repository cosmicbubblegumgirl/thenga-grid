import { getDb } from '@/db';

const products = [
  ['prd_bread', 'Fresh white bread', 'Bakery', 'loaf'],
  ['prd_milk', 'Full cream milk 1L', 'Dairy', 'bottle'],
  ['prd_eggs', 'Large eggs 6-pack', 'Dairy', 'pack'],
  ['prd_coke', 'Coke 2L', 'Drinks', 'bottle'],
  ['prd_maize', 'Maize meal 2kg', 'Pantry', 'bag'],
  ['prd_rice', 'Rice 1kg', 'Pantry', 'bag'],
  ['prd_potatoes', 'Potatoes 2kg', 'Fresh produce', 'bag'],
  ['prd_chicken', 'Chicken portions 1kg', 'Butchery', 'pack'],
] as const;

const shops = [
  ['shop_mamat', "Mama T's", '54 Vilakazi Street, Orlando West, Soweto', -26.2383, 27.9077, 4.9, 186, 6, 1, 1],
  ['shop_lwazi', 'Lwazi Market', 'Mooki Street, Orlando East, Soweto', -26.2305, 27.9246, 4.7, 93, 4, 1, 1],
  ['shop_corner', 'Corner Spot', 'Chris Hani Road, Diepkloof, Soweto', -26.2502, 27.9501, 4.6, 71, 7, 0, 1],
  ['shop_khaya', 'Khaya Fresh Store', 'Maponya Street, Pimville, Soweto', -26.2661, 27.8965, 4.8, 112, 8, 1, 1],
  ['shop_naledi', 'Naledi Superette', 'Koma Road, Jabulani, Soweto', -26.2518, 27.8584, 4.5, 48, 9, 0, 0],
  ['shop_mzansi', 'Mzansi Mini Market', 'Mahalefele Road, Dube, Soweto', -26.2289, 27.8912, 4.7, 64, 5, 1, 1],
] as const;

const stock = [
  ['shop_mamat', 'prd_bread', 1899, 11], ['shop_mamat', 'prd_milk', 2199, 12], ['shop_mamat', 'prd_eggs', 2499, 8], ['shop_mamat', 'prd_coke', 2999, 3], ['shop_mamat', 'prd_maize', 3899, 17],
  ['shop_lwazi', 'prd_bread', 1799, 15], ['shop_lwazi', 'prd_milk', 2299, 8], ['shop_lwazi', 'prd_eggs', 2199, 22], ['shop_lwazi', 'prd_coke', 3199, 14], ['shop_lwazi', 'prd_rice', 2999, 19],
  ['shop_corner', 'prd_bread', 1999, 5], ['shop_corner', 'prd_milk', 2099, 9], ['shop_corner', 'prd_eggs', 2699, 10], ['shop_corner', 'prd_coke', 2399, 9],
  ['shop_khaya', 'prd_potatoes', 2400, 13], ['shop_khaya', 'prd_chicken', 5800, 8], ['shop_khaya', 'prd_rice', 2800, 16], ['shop_khaya', 'prd_bread', 1850, 9],
  ['shop_naledi', 'prd_maize', 3699, 11], ['shop_naledi', 'prd_milk', 2250, 7], ['shop_naledi', 'prd_bread', 1950, 12],
  ['shop_mzansi', 'prd_coke', 2600, 18], ['shop_mzansi', 'prd_eggs', 2350, 14], ['shop_mzansi', 'prd_bread', 1800, 10], ['shop_mzansi', 'prd_milk', 2150, 11],
] as const;

export async function ensureSeedData() {
  const db = getDb();
  const existing = await db.prepare('SELECT COUNT(*) AS count FROM shops').first<{ count: number }>();
  if ((existing?.count ?? 0) > 0) return;

  const now = Math.floor(Date.now() / 1000);
  const statements: D1PreparedStatement[] = [];
  for (const product of products) {
    statements.push(db.prepare('INSERT OR IGNORE INTO products (id, name, category, unit) VALUES (?, ?, ?, ?)').bind(...product));
  }
  for (const shop of shops) {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO shops
      (id, name, address, latitude, longitude, rating, review_count, pickup_minutes, step_free, verified, description, opening_hours, is_open, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Independent shop with live neighbourhood stock', '07:00–20:00', 1, ?)
    `).bind(...shop, now));
  }
  stock.forEach(([shopId, productId, price, quantity], index) => {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO inventory (id, shop_id, product_id, price_cents, quantity, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(`inv_${index + 1}`, shopId, productId, price, quantity, now));
  });
  statements.push(db.prepare(`
    INSERT OR IGNORE INTO drops
    (id, shop_id, product_id, price_cents, original_price_cents, quantity, expires_at, kind, created_at)
    VALUES ('drop_bread', 'shop_mamat', 'prd_bread', 1500, 1999, 11, ?, 'drop', ?)
  `).bind(now + 86400, now));
  statements.push(db.prepare(`
    INSERT OR IGNORE INTO drops
    (id, shop_id, product_id, price_cents, original_price_cents, quantity, expires_at, kind, created_at)
    VALUES ('drop_coke', 'shop_corner', 'prd_coke', 1800, 2999, 9, ?, 'drop', ?)
  `).bind(now + 43200, now));
  statements.push(db.prepare(`
    INSERT OR IGNORE INTO community_posts (id, author_name, body, shop_id, created_at)
    VALUES ('post_1', 'Nandi K.', 'Mama T finally has electricity vouchers again.', 'shop_mamat', ?)
  `).bind(now - 480));
  statements.push(db.prepare(`
    INSERT OR IGNORE INTO community_posts (id, author_name, body, shop_id, created_at)
    VALUES ('post_2', 'Lwazi Market', 'Fresh vetkoek available from 07:00 tomorrow morning.', 'shop_lwazi', ?)
  `).bind(now - 1320));
  await db.batch(statements);
}
