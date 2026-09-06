'use client';

import { ArrowRight, Check, Navigation, Radio, ShieldCheck, Store, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch, isStaticDemo } from '@/lib/api';
import type { Drop, Shop } from '@/lib/types';

export type PaymentReceipt = {
  id?: string;
  orderReference: string;
  amountValue: string;
  assetCode: string;
  status: string;
  pickupCode: string;
  productName: string;
  shopName: string;
  latitude?: number;
  longitude?: number;
  paymentMethod?: 'pickup' | 'open_payments_test' | 'simulated_test_payment';
};

type Props = {
  selection: { drop: Drop; shop: Shop } | null;
  receipt?: PaymentReceipt | null;
  onClose: () => void;
  onComplete: (receipt: PaymentReceipt) => void;
  easyMode?: boolean;
};

const stages = ['Wallet lookup', 'Incoming payment', 'Exact quote', 'Wallet approval', 'Settled'];

export function InterledgerCheckout({ selection, receipt: returnedReceipt, onClose, onComplete, easyMode = false }: Props) {
  const [method, setMethod] = useState<'open_payments' | 'pickup'>('open_payments');
  const [wallet, setWallet] = useState('https://wallet.interledger-test.dev/customer-demo');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(returnedReceipt ?? null);
  if (!selection && !receipt) return null;

  const drop = selection?.drop;
  const shop = selection?.shop;
  const amount = drop?.priceCents ?? Number(receipt?.amountValue ?? 0);

  async function createReservation() {
    if (!drop) throw new Error('Choose a Drop before checkout.');
    const response = await apiFetch('/api/reservations', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dropId: drop.id, paymentMethod: method === 'open_payments' ? 'open_payments_test' : 'pay_at_collection' }),
    });
    const data = await response.json() as { reservation?: { id: string; pickupCode: string }; error?: string };
    if (!response.ok || !data.reservation) throw new Error(data.error || 'Could not reserve this Drop.');
    return data.reservation;
  }

  async function checkout() {
    setBusy(true); setError('');
    try {
      if (method === 'open_payments' && easyMode && !window.confirm('You are about to test the payment journey using sandbox funds. No real money will leave your account.')) return;
      const reservation = await createReservation();
      if (method === 'pickup') {
        const result: PaymentReceipt = {
          orderReference: reservation.id, amountValue: String(drop!.priceCents), assetCode: 'ZAR', status: 'reserved',
          pickupCode: reservation.pickupCode, productName: drop!.productName, shopName: shop!.name, latitude: shop!.latitude,
          longitude: shop!.longitude, paymentMethod: 'pickup',
        };
        setReceipt(result); onComplete(result); return;
      }
      setStage(0);
      const response = await apiFetch('/api/payments/interledger/start', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reservationId: reservation.id, senderWalletAddress: wallet }),
      });
      const data = await response.json() as { paymentId?: string; redirect?: string; simulated?: boolean; error?: string };
      if (!response.ok || !data.paymentId) throw new Error(data.error || 'Could not start the test payment.');
      setStage(3);
      if (data.redirect && !data.simulated) {
        window.location.assign(data.redirect);
        return;
      }
      const continueResponse = await apiFetch('/api/payments/interledger/continue', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paymentId: data.paymentId }),
      });
      const continued = await continueResponse.json() as { payment?: PaymentReceipt; error?: string };
      if (!continueResponse.ok || !continued.payment) throw new Error(continued.error || 'The test payment could not be completed.');
      setStage(4); setReceipt(continued.payment); onComplete(continued.payment);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Checkout could not be completed.');
    } finally { setBusy(false); }
  }

  function openRoute(mode: 'walking' | 'driving') {
    const latitude = receipt?.latitude ?? shop?.latitude;
    const longitude = receipt?.longitude ?? shop?.longitude;
    if (latitude != null && longitude != null) window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=${mode}`, '_blank', 'noopener,noreferrer');
  }

  return <div className="payment-backdrop" onMouseDown={onClose}>
    <section className="payment-sheet" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
      <header><div><p className="eyebrow">OPEN PAYMENTS CHECKOUT · DEMO DATA</p><h1>{receipt ? (receipt.status === 'settled' ? 'Payment settled' : receipt.status === 'simulated_completed' ? 'Demo payment completed' : receipt.status === 'failed' ? 'Test payment not completed' : 'Reserved for collection') : 'Choose how to pay'}</h1></div><button onClick={onClose} aria-label="Close checkout"><X /></button></header>
      {receipt ? <div className="payment-receipt">
        <div className="receipt-check"><Check /></div>
        {receipt.paymentMethod === 'open_payments_test' && <span className="open-payments-badge">OPEN PAYMENTS · TEST</span>}
        {receipt.paymentMethod === 'simulated_test_payment' && <span className="open-payments-badge">SIMULATED TEST PAYMENT</span>}
        {receipt.paymentMethod === 'pickup' && <span className="open-payments-badge">PAY AT COLLECTION · DEMO ORDER</span>}
        {receipt.status === 'simulated_completed' && <p className="payment-disclosure">Demo payment completed—no real funds were transferred.</p>}
        {receipt.status === 'settled' && <p className="payment-disclosure">Sandbox transaction—no real funds transferred.</p>}
        {receipt.status === 'failed' && <p className="payment-disclosure">The sandbox wallet did not complete this test. No real funds were transferred.</p>}
        <h2>{receipt.productName}</h2><p>{receipt.shopName}</p>
        <dl><div><dt>Pickup code</dt><dd>{receipt.pickupCode}</dd></div><div><dt>Order reference</dt><dd>{receipt.orderReference}</dd></div><div><dt>Amount {receipt.status === 'settled' ? 'paid' : 'shown'}</dt><dd>R{(Number(receipt.amountValue) / 100).toFixed(2)}</dd></div></dl>
        <div className="receipt-routes"><Button onClick={() => openRoute('walking')}><Navigation /> Start walk</Button><Button variant="outline" onClick={() => openRoute('driving')}><Navigation /> Start drive</Button></div>
      </div> : <>
        <div className="payment-item"><Store /><div><span className="demo-data-badge">DEMO DATA</span><strong>{drop?.productName}</strong><small>{shop?.name} · Server-calculated total</small></div><b>R{(amount / 100).toFixed(2)}</b></div>
        <div className="payment-methods"><button className={method === 'open_payments' ? 'active' : ''} onClick={() => setMethod('open_payments')}><Radio /><strong>Pay with Open Payments – Test</strong><small>Approve with a test wallet</small></button><button className={method === 'pickup' ? 'active' : ''} onClick={() => setMethod('pickup')}><Store /><strong>Pay at collection</strong><small>Reserve now, pay at the shop</small></button></div>
        {method === 'open_payments' && <><label className="wallet-field">Test-wallet address<Input value={wallet} onChange={(event) => setWallet(event.target.value)} /></label><div className="payment-stages">{stages.map((label, index) => <span className={index <= stage ? 'active' : ''} key={label}><i>{index < stage ? <Check /> : index + 1}</i><small>{label}</small></span>)}</div></>}
        <div className="sandbox-notice"><ShieldCheck /><span><strong>Test payment only · Sandbox funds · No real money will be charged.</strong><small>{isStaticDemo ? 'GitHub Pages simulates this journey. It cannot settle a wallet transaction.' : 'Approval is handled by your configured test-wallet provider.'}</small></span></div>
        {error && <p className="payment-error">{error}</p>}
        <Button className="payment-submit" disabled={busy} onClick={() => void checkout()}>{busy ? 'Processing…' : method === 'pickup' ? `Reserve for collection · R${(amount / 100).toFixed(2)}` : `Pay R${(amount / 100).toFixed(2)} with test wallet`}<ArrowRight /></Button>
      </>}
    </section>
  </div>;
}
