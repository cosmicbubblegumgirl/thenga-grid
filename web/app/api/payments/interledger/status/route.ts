import { getDb } from '@/db';
import { getSessionUser, json } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return json({ error: 'Sign in to view a payment.' }, { status: 401 });
  const paymentId = new URL(request.url).searchParams.get('paymentId') ?? '';
  const payment = await getDb().prepare(`
    SELECT id, order_reference AS orderReference, amount_value AS amountValue, asset_code AS assetCode,
      asset_scale AS assetScale, status, outgoing_payment_url AS outgoingPaymentUrl, created_at AS createdAt
    FROM interledger_payments WHERE id = ? AND user_id = ?
  `).bind(paymentId, user.id).first();
  return payment ? json({ payment }) : json({ error: 'Payment not found.' }, { status: 404 });
}
