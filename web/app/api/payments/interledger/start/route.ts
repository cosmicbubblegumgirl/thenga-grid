import { getDb } from '@/db';
import { getSessionUser, json, newId, safeText } from '@/lib/auth';
import {
  createInterledgerClient,
  finalizedAccessToken,
  getInterledgerConfig,
  validWalletAddress,
} from '@/lib/interledger';

type InteractiveGrant = {
  interact?: { redirect?: string; finish?: string };
  continue?: { uri?: string; access_token?: { value?: string } };
};

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return json({ error: 'Sign in to start a payment.' }, { status: 401 });
  if (user.role !== 'customer') return json({ error: 'Use a customer account to pay.' }, { status: 403 });

  const body = await request.json<Record<string, unknown>>();
  const senderWallet = validWalletAddress(body.senderWalletAddress);
  const reservationId = safeText(body.reservationId, 100);
  const requestedReturnUri = safeText(body.returnUri, 500);
  if (!senderWallet) return json({ error: 'Enter a valid HTTPS wallet address.' }, { status: 400 });
  if (!reservationId) return json({ error: 'Reservation reference is required.' }, { status: 400 });
  let returnUri: string | null = null;
  if (requestedReturnUri) {
    try {
      const candidate = new URL(requestedReturnUri);
      const sameWebOrigin = candidate.origin === new URL(request.url).origin;
      if ((candidate.protocol === 'thengagrid:' && candidate.hostname === 'payment') || sameWebOrigin) returnUri = candidate.toString();
      else return json({ error: 'The payment return address is not allowed.' }, { status: 400 });
    } catch { return json({ error: 'The payment return address is invalid.' }, { status: 400 }); }
  }

  const db = getDb();
  const reservation = await db.prepare(`
    SELECT reservations.id, reservations.status, drops.price_cents AS priceCents,
      drops.shop_id AS shopId, shops.name AS shopName
    FROM reservations
    JOIN drops ON drops.id = reservations.drop_id
    JOIN shops ON shops.id = drops.shop_id
    WHERE reservations.id = ? AND reservations.customer_id = ?
  `).bind(reservationId, user.id).first<{ id: string; status: string; priceCents: number; shopId: string; shopName: string }>();
  if (!reservation) return json({ error: 'Reservation was not found.' }, { status: 404 });
  if (reservation.shopId !== 'shop_mamat') return json({ error: "Open Payments testing is currently available for Mama T's Drops." }, { status: 409 });
  if (reservation.status !== 'awaiting_payment') {
    return json({ error: 'This reservation can no longer be paid.' }, { status: 409 });
  }
  const existing = await db.prepare(`SELECT id, status FROM interledger_payments WHERE order_reference = ?`).bind(reservation.id).first<{ id: string; status: string }>();
  if (existing) return json({ error: 'A payment is already in progress for this reservation.', paymentId: existing.id, status: existing.status }, { status: 409 });
  const amountValue = String(reservation.priceCents);
  const orderReference = reservation.id;

  const paymentId = newId('ilp');
  const now = Math.floor(Date.now() / 1000);
  let receiverWallet = '';
  try {
    const config = getInterledgerConfig();
    receiverWallet = config.receiverWalletAddress;
    await db.prepare(`
      INSERT INTO interledger_payments
      (id, user_id, order_reference, amount_value, asset_code, asset_scale, sender_wallet, receiver_wallet, return_uri, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'ZAR', 2, ?, ?, ?, 'starting', ?, ?)
    `).bind(paymentId, user.id, orderReference, amountValue, senderWallet, receiverWallet, returnUri, now, now).run();

    const client = await createInterledgerClient(config);
    const [sender, receiver] = await Promise.all([
      client.walletAddress.get({ url: senderWallet }),
      client.walletAddress.get({ url: receiverWallet }),
    ]);

    const incomingGrant = await client.grant.request(
      { url: receiver.authServer },
      { access_token: { access: [{ type: 'incoming-payment', actions: ['create', 'read'] }] } },
    );
    const incomingPayment = await client.incomingPayment.create(
      { url: receiver.resourceServer, accessToken: finalizedAccessToken(incomingGrant) },
      {
        walletAddress: receiver.id,
        incomingAmount: { value: amountValue, assetCode: 'ZAR', assetScale: 2 },
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        metadata: { description: 'THENGA GRID pickup order', externalRef: orderReference },
      },
    );

    const quoteGrant = await client.grant.request(
      { url: sender.authServer },
      { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } },
    );
    const quote = await client.quote.create(
      { url: sender.resourceServer, accessToken: finalizedAccessToken(quoteGrant) },
      { method: 'ilp', walletAddress: sender.id, receiver: incomingPayment.id },
    );

    const clientNonce = crypto.randomUUID();
    const finishUrl = new URL('/api/payments/interledger/continue', request.url);
    finishUrl.searchParams.set('paymentId', paymentId);
    const outgoingGrant = await client.grant.request(
      { url: sender.authServer },
      {
        access_token: {
          access: [{
            type: 'outgoing-payment',
            actions: ['create', 'read'],
            identifier: sender.id,
            limits: { debitAmount: quote.debitAmount },
          }],
        },
        interact: {
          start: ['redirect'],
          finish: { method: 'redirect', uri: finishUrl.toString(), nonce: clientNonce },
        },
      },
    ) as InteractiveGrant;
    const redirect = outgoingGrant.interact?.redirect;
    const interactNonce = outgoingGrant.interact?.finish;
    const continueUri = outgoingGrant.continue?.uri;
    const continueToken = outgoingGrant.continue?.access_token?.value;
    if (!redirect || !interactNonce || !continueUri || !continueToken) {
      throw new Error('The wallet did not return an interactive payment grant.');
    }

    await db.prepare(`
      UPDATE interledger_payments SET incoming_payment_url = ?, quote_url = ?, auth_server = ?,
        continue_uri = ?, continue_token = ?, client_nonce = ?, interact_nonce = ?, status = 'awaiting_consent', updated_at = ?
      WHERE id = ?
    `).bind(incomingPayment.id, quote.id, sender.authServer, continueUri, continueToken, clientNonce, interactNonce, Math.floor(Date.now() / 1000), paymentId).run();
    return json({
      paymentId,
      status: 'awaiting_consent',
      redirect,
      quote: { debitAmount: quote.debitAmount, receiveAmount: quote.receiveAmount },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Payment setup failed.';
    await db.prepare(`UPDATE interledger_payments SET status = 'failed', error = ?, updated_at = ? WHERE id = ?`)
      .bind(message, Math.floor(Date.now() / 1000), paymentId).run().catch(() => undefined);
    console.error('Interledger payment setup failed', { paymentId, receiverWallet, error });
    return json({ error: 'The Interledger payment could not be started.' }, { status: 502 });
  }
}
