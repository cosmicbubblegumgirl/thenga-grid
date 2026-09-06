import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  role: text('role', { enum: ['customer', 'owner'] }).notNull(),
  displayName: text('display_name').notNull(),
  phone: text('phone'),
  createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('idx_users_email').on(table.email)]);

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_sessions_user_id').on(table.userId)]);

export const shops = sqliteTable('shops', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description').notNull().default('Independent neighbourhood shop'),
  address: text('address').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  phone: text('phone'),
  openingHours: text('opening_hours').notNull().default('07:00–20:00'),
  rating: real('rating').notNull().default(4.5),
  reviewCount: integer('review_count').notNull().default(0),
  pickupMinutes: integer('pickup_minutes').notNull().default(10),
  stepFree: integer('step_free', { mode: 'boolean' }).notNull().default(false),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  isOpen: integer('is_open', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_shops_owner_id').on(table.ownerId)]);

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  unit: text('unit').notNull().default('each'),
}, (table) => [uniqueIndex('idx_products_name').on(table.name)]);

export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  priceCents: integer('price_cents').notNull(),
  quantity: integer('quantity').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_inventory_shop_product').on(table.shopId, table.productId)]);

export const drops = sqliteTable('drops', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  priceCents: integer('price_cents').notNull(),
  originalPriceCents: integer('original_price_cents').notNull(),
  quantity: integer('quantity').notNull(),
  expiresAt: integer('expires_at').notNull(),
  kind: text('kind', { enum: ['drop', 'last_crate'] }).notNull().default('drop'),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_drops_shop_expires').on(table.shopId, table.expiresAt)]);

export const reservations = sqliteTable('reservations', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dropId: text('drop_id').notNull().references(() => drops.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['reserved', 'packing', 'ready', 'collected', 'cancelled'] }).notNull().default('reserved'),
  pickupCode: text('pickup_code').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_reservations_customer_id').on(table.customerId),
  index('idx_reservations_drop_id').on(table.dropId),
]);

export const communityPosts = sqliteTable('community_posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
  shopId: text('shop_id').references(() => shops.id, { onDelete: 'set null' }),
  authorName: text('author_name').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_community_posts_created_at').on(table.createdAt)]);

export const demandRequests = sqliteTable('demand_requests', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => users.id, { onDelete: 'set null' }),
  query: text('query').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_demand_requests_created_at').on(table.createdAt)]);

export const interledgerPayments = sqliteTable('interledger_payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderReference: text('order_reference').notNull(),
  amountValue: text('amount_value').notNull(),
  assetCode: text('asset_code').notNull().default('ZAR'),
  assetScale: integer('asset_scale').notNull().default(2),
  senderWallet: text('sender_wallet').notNull(),
  receiverWallet: text('receiver_wallet').notNull(),
  incomingPaymentUrl: text('incoming_payment_url'),
  quoteUrl: text('quote_url'),
  outgoingPaymentUrl: text('outgoing_payment_url'),
  authServer: text('auth_server'),
  continueUri: text('continue_uri'),
  continueToken: text('continue_token'),
  clientNonce: text('client_nonce'),
  interactNonce: text('interact_nonce'),
  status: text('status', { enum: ['starting', 'awaiting_consent', 'settled', 'failed'] }).notNull().default('starting'),
  error: text('error'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_interledger_payments_user_id').on(table.userId),
  uniqueIndex('idx_interledger_payments_order_reference').on(table.orderReference),
]);
