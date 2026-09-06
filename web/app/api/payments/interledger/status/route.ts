import { getDb } from '@/db';
import { getSessionUser, json } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return json({ error: 'Sign in to view a payment.' }, { status: 401 });
  const paymentId = new URL(request.url).searchParams.get('paymentId') ?? '';
  const payment = await getDb().prepare(`
    SELECT interledger_payments.id, interledger_payments.order_reference AS orderReference,
      interledger_payments.amount_value AS amountValue, interledger_payments.asset_code AS assetCode,
      interledger_payments.asset_scale AS assetScale, interledger_payments.status,
      interledger_payments.outgoing_payment_url AS outgoingPaymentUrl,
      interledger_payments.created_at AS createdAt, reservations.pickup_code AS pickupCode,
      products.name AS productName, shops.name AS shopName, users.display_name AS customerName,
      shops.latitude, shops.longitude
    FROM interledger_payments
    JOIN reservations ON reservations.id = interledger_payments.order_reference
    JOIN drops ON drops.id = reservations.drop_id
    JOIN products ON products.id = drops.product_id
    JOIN shops ON shops.id = drops.shop_id
    JOIN users ON users.id = reservations.customer_id
    WHERE interledger_payments.id = ? AND interledger_payments.user_id = ?
  `).bind(paymentId, user.id).first();
  return payment ? json({ payment }) : json({ error: 'Payment not found.' }, { status: 404 });
}
