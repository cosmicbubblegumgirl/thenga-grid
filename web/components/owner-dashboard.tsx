'use client';

import { BarChart3, Box, ChevronRight, CircleAlert, Flame, MapPin, PackageCheck, Plus, Radio, RefreshCw, Search, TrendingUp, Users } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

type Shop = { id: string; name: string; address: string; isOpen: boolean; verified: boolean };
type Item = { id: string; productId: string; name: string; category: string; priceCents: number; quantity: number };
type Order = { id: string; status: string; pickupCode: string; productName: string; customerName: string; priceCents: number; paymentStatus?: string; paymentMethod?: string; paidAmountValue?: string };
type Demand = { query: string; searches: number };
type OwnerData = { shop: Shop; inventory: Item[]; orders: Order[]; demand: Demand[] };

export function OwnerDashboard({ notify }: { notify: (message: string) => void }) {
  const [data, setData] = useState<OwnerData | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<'pulse' | 'stock' | 'orders' | 'drops'>('pulse');
  const [showProductForm, setShowProductForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch('/api/owner/shop');
      const result = await response.json() as OwnerData & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not load your shop.');
      setData(result);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your shop.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await apiFetch('/api/owner/inventory', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return notify(result.error || 'Could not add the product.');
    form.reset();
    setShowProductForm(false);
    notify('Product added to live stock');
    await load();
  }

  async function updateOrder(id: string, status: string) {
    const response = await apiFetch('/api/owner/orders', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reservationId: id, status }) });
    if (response.ok) { notify(`Order moved to ${status}`); await load(); }
  }

  if (error) return <div className="owner-empty"><CircleAlert /><h2>Shop Pulse is unavailable</h2><p>{error}</p><Button onClick={() => void load()}>Try again</Button></div>;
  if (!data) return <div className="owner-empty"><RefreshCw className="spin" /><h2>Loading your Shop Pulse…</h2></div>;

  const lowStock = data.inventory.filter((item) => item.quantity < 6).length;
  const openOrders = data.orders.filter((order) => !['collected', 'cancelled'].includes(order.status)).length;
  const stockValue = data.inventory.reduce((total, item) => total + item.priceCents * item.quantity, 0) / 100;

  return (
    <div className="owner-layout">
      <aside className="owner-sidebar">
        <div className="owner-shop-card"><span>{data.shop.name.slice(0, 2).toUpperCase()}</span><div><small>SHOP SIGNAL</small><strong>{data.shop.name}</strong><p><MapPin /> {data.shop.address}</p></div></div>
        <nav>
          <button className={section === 'pulse' ? 'active' : ''} onClick={() => setSection('pulse')}><BarChart3 /> Pulse</button>
          <button className={section === 'stock' ? 'active' : ''} onClick={() => setSection('stock')}><Box /> Live stock <b>{data.inventory.length}</b></button>
          <button className={section === 'orders' ? 'active' : ''} onClick={() => setSection('orders')}><PackageCheck /> Grab & Go <b>{openOrders}</b></button>
          <button className={section === 'drops' ? 'active' : ''} onClick={() => setSection('drops')}><Flame /> Drops</button>
        </nav>
        <div className="signal-strength"><Radio /><span><small>SIGNAL</small><strong>{data.shop.isOpen ? 'Strong · Shop open' : 'Paused · Shop closed'}</strong></span></div>
      </aside>

      <section className="owner-content">
        <header className="owner-heading"><div><p className="eyebrow">MERCHANT GRID</p><h1>{section === 'pulse' ? 'Good morning. Here’s your shop.' : section === 'stock' ? 'Live stock' : section === 'orders' ? 'Grab & Go orders' : 'Launch a Drop'}</h1></div><Button onClick={() => setShowProductForm(true)}><Plus /> Add product</Button></header>
        <p className="owner-demo-disclosure"><b>DEMO DATA</b> Shop, stock, customer, order, payment and dashboard figures shown in this prototype may be fictional.</p>

        {section === 'pulse' && <>
          <div className="metric-grid">
            <article><span className="metric-icon green"><TrendingUp /></span><small>LIVE STOCK VALUE</small><strong>R{stockValue.toFixed(0)}</strong><p>Across {data.inventory.length} products</p></article>
            <article><span className="metric-icon orange"><PackageCheck /></span><small>GRAB & GO</small><strong>{openOrders}</strong><p>Orders need attention</p></article>
            <article><span className="metric-icon blue"><Users /></span><small>NEED RADAR</small><strong>{data.demand.reduce((sum, item) => sum + Number(item.searches), 0)}</strong><p>Local searches this week</p></article>
            <article><span className="metric-icon red"><CircleAlert /></span><small>LOW STOCK</small><strong>{lowStock}</strong><p>Products below 6 units</p></article>
          </div>
          <div className="owner-columns">
            <section className="insight-card"><div className="card-heading"><div><Search /><span><small>NEED RADAR</small><h2>What people want nearby</h2></span></div><b>Last 7 days</b></div>{data.demand.length ? data.demand.map((item) => <div className="demand-row" key={item.query}><span>{item.query}</span><strong>{item.searches} searches</strong><ChevronRight /></div>) : <p className="muted-empty">Demand intelligence appears as customers search and post requests.</p>}</section>
            <section className="insight-card"><div className="card-heading"><div><Box /><span><small>SMART STOCK WHISPER</small><h2>Useful actions</h2></span></div></div>{lowStock ? data.inventory.filter((item) => item.quantity < 6).slice(0, 4).map((item) => <button className="whisper" key={item.id} onClick={() => setSection('stock')}><CircleAlert /><span><strong>{item.name} is running low</strong><small>{item.quantity} left · update stock before the afternoon rush</small></span><ChevronRight /></button>) : <p className="muted-empty">Your stock levels look healthy.</p>}</section>
          </div>
        </>}

        {section === 'stock' && <section className="data-card"><div className="table-title"><div><h2>Inventory</h2><p>Prices and quantities shown to customers in real time.</p></div><Button variant="outline" onClick={() => setShowProductForm(true)}><Plus /> Add product</Button></div><div className="stock-table"><div className="stock-table-head"><span>Product</span><span>Price</span><span>Quantity</span><span>Signal</span></div>{data.inventory.map((item) => <div className="stock-table-row" key={item.id}><span><strong>{item.name}</strong><small>{item.category}</small></span><b>R{(item.priceCents / 100).toFixed(2)}</b><b>{item.quantity}</b><i className={item.quantity < 6 ? 'low' : ''}>{item.quantity < 6 ? 'Low' : 'Live'}</i></div>)}</div></section>}

        {section === 'orders' && <section className="order-board">{['reserved', 'packing', 'ready'].map((status) => <div className={`order-lane ${status}`} key={status}><h2><i />{status === 'reserved' ? 'New' : status}<b>{data.orders.filter((order) => order.status === status).length}</b></h2>{data.orders.filter((order) => order.status === status).map((order) => <article key={order.id}>{order.paymentStatus && <div className={`owner-payment ${order.paymentStatus === 'settled' ? '' : 'simulated'}`}><span>{order.paymentStatus === 'settled' ? 'PAID · OPEN PAYMENTS TEST' : order.paymentMethod === 'simulated_test_payment' ? 'SIMULATED TEST PAYMENT' : 'PAY AT COLLECTION · DEMO ORDER'}</span><strong>{order.paymentStatus === 'settled' ? `R${(Number(order.paidAmountValue ?? order.priceCents) / 100).toFixed(2)} test payment received` : 'Demo payment completed—no real funds transferred.'}</strong></div>}<div><strong>{order.customerName} <em className="demo-data-badge">DEMO DATA</em></strong><small>{order.productName}</small></div><span>R{(order.priceCents / 100).toFixed(2)}</span><p>Pickup code <b>{order.pickupCode}</b></p>{status !== 'ready' ? <Button onClick={() => void updateOrder(order.id, status === 'reserved' ? 'packing' : 'ready')}>{status === 'reserved' ? 'Start packing' : 'Mark ready'}</Button> : <Button onClick={() => void updateOrder(order.id, 'collected')}>Collected</Button>}</article>)}</div>)}</section>}

        {section === 'drops' && <DropBuilder shopName={data.shop.name} inventory={data.inventory} onCreated={async () => { notify('Your Drop is live on the Grid'); await load(); }} />}
      </section>

      {showProductForm && <div className="sheet-backdrop" onMouseDown={() => setShowProductForm(false)}><form className="product-sheet" onSubmit={addProduct} onMouseDown={(event) => event.stopPropagation()}><div><p className="eyebrow">LIVE STOCK</p><h2>Add a product</h2><button type="button" onClick={() => setShowProductForm(false)}>×</button></div><label>Product name<Input name="name" required placeholder="e.g. Brown bread 700g" /></label><label>Category<Input name="category" required placeholder="e.g. Bakery" /></label><div className="form-pair"><label>Price (rand)<Input name="price" type="number" min="0.01" step="0.01" required placeholder="19.99" /></label><label>Quantity<Input name="quantity" type="number" min="0" step="1" required placeholder="12" /></label></div><Button type="submit">Publish to live stock</Button></form></div>}
    </div>
  );
}

function DropBuilder({ shopName, inventory, onCreated }: { shopName: string; inventory: Item[]; onCreated: () => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await apiFetch('/api/owner/drops', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    if (response.ok) { form.reset(); onCreated(); }
  }
  return <section className="drop-builder"><div className="drop-preview"><span><Flame /> LIVE DROP PREVIEW</span><p>{shopName.toUpperCase()} JUST DROPPED</p><h2>Turn extra stock into a neighbourhood signal.</h2><strong>One tap makes the map pulse.</strong></div><form onSubmit={submit}><h2>Create a 24-hour Drop</h2><label>Product<select name="productId" required><option value="">Choose stocked product</option>{inventory.map((item) => <option key={item.productId} value={item.productId}>{item.name} · {item.quantity} in stock</option>)}</select></label><div className="form-pair"><label>Normal price<Input name="originalPrice" type="number" min="0.01" step="0.01" required /></label><label>Drop price<Input name="price" type="number" min="0.01" step="0.01" required /></label></div><div className="form-pair"><label>Quantity<Input name="quantity" type="number" min="1" step="1" required /></label><label>Drop type<select name="kind"><option value="drop">Flash Drop</option><option value="last_crate">Last Crate</option></select></label></div><Button type="submit"><Flame /> Publish Drop</Button></form></section>;
}
