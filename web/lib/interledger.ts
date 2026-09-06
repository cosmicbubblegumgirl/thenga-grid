import {
  createAuthenticatedClient,
  isFinalizedGrantWithAccessToken,
} from '@interledger/open-payments';
import type { Grant, GrantContinuation } from '@interledger/open-payments';
import { env } from 'cloudflare:workers';

type PaymentEnvironment = {
  INTERLEDGER_CLIENT_WALLET_ADDRESS?: string;
  INTERLEDGER_PRIVATE_KEY?: string;
  INTERLEDGER_KEY_ID?: string;
  INTERLEDGER_RECEIVER_WALLET_ADDRESS?: string;
};

export type InterledgerConfig = {
  clientWalletAddress: string;
  privateKey: string;
  keyId: string;
  receiverWalletAddress: string;
};

export function getInterledgerConfig(): InterledgerConfig {
  const values = env as unknown as PaymentEnvironment;
  const clientWalletAddress = values.INTERLEDGER_CLIENT_WALLET_ADDRESS?.trim();
  const privateKey = values.INTERLEDGER_PRIVATE_KEY?.replaceAll('\\n', '\n').trim();
  const keyId = values.INTERLEDGER_KEY_ID?.trim();
  const receiverWalletAddress = values.INTERLEDGER_RECEIVER_WALLET_ADDRESS?.trim();
  if (!clientWalletAddress || !privateKey || !keyId || !receiverWalletAddress) {
    throw new Error('Interledger server credentials are not configured.');
  }
  return { clientWalletAddress, privateKey, keyId, receiverWalletAddress };
}

export async function createInterledgerClient(config = getInterledgerConfig()) {
  return createAuthenticatedClient({
    walletAddressUrl: config.clientWalletAddress,
    privateKey: config.privateKey,
    keyId: config.keyId,
    requestTimeoutMs: 15_000,
  });
}

export function finalizedAccessToken(grant: GrantContinuation | Grant) {
  if (!isFinalizedGrantWithAccessToken(grant)) throw new Error('The wallet did not issue an access token.');
  return grant.access_token.value;
}

export function validWalletAddress(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

export async function interactionHash(input: {
  clientNonce: string;
  interactNonce: string;
  interactRef: string;
  authServer: string;
}) {
  const message = `${input.clientNonce}\n${input.interactNonce}\n${input.interactRef}\n${input.authServer}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
