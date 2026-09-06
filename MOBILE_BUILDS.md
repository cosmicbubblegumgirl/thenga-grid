# Mobile release builds

THENGA//GRID ships as two branded variants from the same maintained codebase:

- Customer: `za.co.thengagrid.customer`
- Merchant: `za.co.thengagrid.merchant`

Installable Android packages are published at:

<https://github.com/cosmicbubblegumgirl/thenga-grid/releases>

The repository workflow builds both variants independently, verifies the native project generation and publishes the resulting APK files as one release. These packages are signed for direct demonstration installs. A private production keystore is required before Play Store distribution.

## One-time setup

1. Install dependencies with `pnpm install` in `mobile`.
2. Run `npx eas login` in a local terminal.
3. Run `npx eas build:configure` if the Expo project has not yet been linked to an Expo account.
4. For iOS, connect the Apple Developer team that owns the final bundle identifiers.

## Build commands

```bash
pnpm run build:customer:android
pnpm run build:merchant:android
pnpm run build:customer:ios
pnpm run build:merchant:ios
```

EAS returns a download URL after each successful build. The Android profiles output APK files for direct installation. The iOS profiles output signed internal-distribution builds; Apple controls provisioning, device registration and App Store distribution.

If the backend moves, set `EXPO_PUBLIC_API_URL` in the build profile or local environment before building. When it is omitted, the apps use their built-in fictional demonstration data and local accounts.
