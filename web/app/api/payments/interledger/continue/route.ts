import { getDb } from '@/db';
import { createInterledgerClient, finalizedAccessToken, interactionHash } from '@/lib/interledger';

type PaymentRow = {
  id: string;
  senderWallet: string;
  quoteUrl: string;
  authServer: string;
  continueUri: string;
  continueToken: string;
  clientNonce: string;
  interactNonce: string;
  status: string;
};

function paymentRedirect(request: Request, status: 'success' | 'failed', paymentId: string) {
  const url = new URL('/', request.url);
  url.searchParams.set('payment', `ilp-${status}`);
  url.searchParams.set('paymentId', paymentId);
  return Response.redirect(url.toString(), 303);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('paymentId') ?? '';
  const interactRef = url.searchParams.get('interact_ref') ?? '';
  const receivedHash = url.searchParams.get('hash') ?? '';
  if (!paymentId || !interactRef || !receivedHash) return new Response('Invalid payment callback.', { status: 400 });

  const db = getDb();
  const payment = await db.prepare(`
    SELECT id, sender_wallet AS senderWallet, quote_url AS quoteUrl, auth_server AS authServer,
      continue_uri AS continueUri, continue_token AS continueToken, client_nonce AS clientNonce,
      interact_nonce AS interactNonce, status
    FROM interledger_payments WHERE id = ?
  `).bind(paymentId).first<PaymentRow>();
  if (!payment || payment.status !== 'awaiting_consent') return new Response('Payment is not awaiting consent.', { status: 409 });

  try {
    const expectedHash = await interactionHash({
      clientNonce: payment.clientNonce,
      interactNonce: payment.interactNonce,
      interactRef,
      authServer: payment.authServer,
    });
    if (expectedHash !== receivedHash) throw new Error('Wallet interaction hash did not match.');

    const client = await createInterledgerClient();
    const finalizedGrant = await client.grant.continue(
      { url: payment.continueUri, accessToken: payment.continueToken },
      { interact_ref: interactRef },
    );
    const sender = await client.walletAddress.get({ url: payment.senderWallet });
    const outgoingPayment = await client.outgoingPayment.create(
      { url: sender.resourceServer, accessToken: finalizedAccessToken(finalizedGrant) },
      {
        walletAddress: sender.id,
        quoteId: payment.quoteUrl,
        metadata: { description: 'THENGA GRID pickup order', externalRef: payment.id },
      },
    );
    await db.prepare(`
      UPDATE interledger_payments SET outgoing_payment_url = ?, status = 'settled',
        continue_token = NULL, updated_at = ? WHERE id = ?
    `).bind(outgoingPayment.id, Math.floor(Date.now() / 1000), paymentId).run();
    return paymentRedirect(request, 'success', paymentId);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Payment continuation failed.';
    await db.prepare(`UPDATE interledger_payments SET status = 'failed', error = ?, continue_token = NULL, updated_at = ? WHERE id = ?`)
      .bind(message, Math.floor(Date.now() / 1000), paymentId).run();
    console.error('Interledger payment continuation failed', { paymentId, error });
    return paymentRedirect(request, 'failed', paymentId);
  }
}
