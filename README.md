# THENGA//GRID

**Your neighbourhood. Live.**

Live website: <https://cosmicbubblegumgirl.github.io/thenga-grid/>

Android downloads: <https://github.com/cosmicbubblegumgirl/thenga-grid/releases>

THENGA//GRID is a neighbourhood shopping platform for customers and independent shop owners. Customers can locate nearby stores, compare baskets, reserve drops and post local demand. Shop owners get a dedicated dashboard for inventory, orders, promotions and demand signals.

## What is included

- `web` — responsive customer experience, merchant dashboard and server API
- `mobile` — Expo customer and merchant apps for Android and iOS
- Secure email/password accounts with customer and shop-owner roles
- Database-backed shops, products, inventory, reservations, orders, drops and community requests
- Browser and mobile geolocation
- OpenStreetMap tiles, reverse geocoding and live nearby-place results
- Basket comparison, route opening, favourites, Easy Mode and community features
- Production deployment configuration and database migrations

## Web app

Requirements: Node.js 22.13 or newer and pnpm.

```bash
cd web
pnpm install
pnpm run dev
```

Create a production worker bundle with:

```bash
pnpm run build
```

Create the static GitHub Pages demonstration with:

```bash
pnpm run build:pages
```

The Pages build preserves the customer and shop-owner experiences using fictional seed data stored in the visitor's browser. It does not submit credentials or demo changes to a server. The Cloudflare worker build remains the production path for shared accounts, persistent data, live OpenStreetMap discovery and real integrations.

The contents of `web/dist-pages` are published from the repository's `gh-pages` branch.

The database schema is in `web/db/schema.ts`; generated migrations are in `web/drizzle`. Authentication uses salted PBKDF2 password hashes and revocable HTTP-only sessions. Seed records are inserted only into an empty database.

## Mobile apps

```bash
cd mobile
pnpm install
pnpm start
```

The mobile app reads `EXPO_PUBLIC_API_URL`. Without a deployed API URL, each variant runs as a complete local demonstration with fictional shops, inventory, Drops, pickup reservations, demand signals and orders. When connected to the API, it stores bearer sessions in the operating system's secure credential store. Location access is requested only when needed.

The customer and merchant builds use separate package identifiers and EAS profiles:

```bash
pnpm run build:customer:android
pnpm run build:merchant:android
pnpm run build:customer:ios
pnpm run build:merchant:ios
```

Android profiles produce installable APKs. iOS builds require an Apple Developer team and device/distribution signing. Sign in to Expo locally before running cloud builds; do not place account passwords or signing secrets in this repository.

GitHub also builds both Android variants automatically after relevant changes on `main`. Successful packages are published on the repository Releases page.

## Configuration

Copy `mobile/.env.example` to `mobile/.env` when using a different API deployment. Production deployments should provide their own site URL, database binding and access policy through the hosting environment.

Do not commit `.env` files, service credentials, signing certificates or private keys.
