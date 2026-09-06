'use client';

import { ArrowLeft, Check, MapPin, ShieldCheck, Store, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch, isStaticDemo } from '@/lib/api';
import type { AccountRole, Position, User } from '@/lib/types';

type Props = {
  location: Position;
  locationName: string;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
};

export function AuthScreen({ location, locationName, onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [role, setRole] = useState<AccountRole>('customer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (mode === 'signup') Object.assign(payload, { role, latitude: location.latitude, longitude: location.longitude });
    try {
      const response = await apiFetch(`/api/auth/${mode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { user?: User; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || 'Could not continue.');
      onAuthenticated(data.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not continue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen" role="dialog" aria-modal="true" aria-label={mode === 'signup' ? 'Create your account' : 'Sign in'}>
      <section className="auth-story">
        <button className="auth-back" onClick={onClose}><ArrowLeft /> Back to the Grid</button>
        <div className="auth-brand"><BrandIcon /><span><strong>THENGA</strong>//GRID</span></div>
        <div className="auth-pitch">
          <p className="eyebrow">YOUR NEIGHBOURHOOD. LIVE.</p>
          <h1>{role === 'owner' ? 'Put your shop on the Grid.' : 'Shop local with better information.'}</h1>
          <p>{role === 'owner' ? 'Publish stock, launch Drops, manage Grab & Go orders and understand what your neighbourhood needs.' : 'Compare baskets, see what is in stock and reserve before you walk.'}</p>
          <ul>
            <li><Check /> Live local stock and prices</li>
            <li><Check /> Location-aware routes and shop discovery</li>
            <li><Check /> Secure account and reservation history</li>
          </ul>
        </div>
        <div className="auth-location"><MapPin /><span><small>Grid location</small><strong>{locationName}</strong></span></div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-tabs" role="tablist">
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Create account</button>
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
        </div>

        <div className="auth-form-wrap">
          <p className="eyebrow">{mode === 'signup' ? 'JOIN THE GRID' : 'WELCOME BACK'}</p>
          <h2>{mode === 'signup' ? 'Choose how you use THENGA//GRID' : 'Sign in to continue'}</h2>

          {mode === 'signup' && (
            <div className="role-select" aria-label="Account type">
              <button type="button" className={role === 'customer' ? 'active' : ''} onClick={() => setRole('customer')}>
                <UserRound /><span><strong>Customer</strong><small>Find, compare and reserve</small></span>{role === 'customer' && <Check />}
              </button>
              <button type="button" className={role === 'owner' ? 'active owner' : ''} onClick={() => setRole('owner')}>
                <Store /><span><strong>Shop owner</strong><small>Manage stock and orders</small></span>{role === 'owner' && <Check />}
              </button>
            </div>
          )}

          <form onSubmit={submit} className="account-form">
            {mode === 'signup' && <label>Full name<Input name="displayName" autoComplete="name" required placeholder="Your name" /></label>}
            <label>Email address<Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
            <label>Password<Input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} /></label>
            {mode === 'signup' && <label>Mobile number <span>optional</span><Input name="phone" type="tel" autoComplete="tel" placeholder="e.g. 071 234 5678" /></label>}
            {mode === 'signup' && role === 'owner' && (
              <>
                <label>Shop name<Input name="shopName" required placeholder="e.g. Mama T's" /></label>
                <label>Shop address<Input name="address" required defaultValue={locationName} placeholder="Street and neighbourhood" /></label>
              </>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" disabled={busy} className="auth-submit">
              {busy ? 'Please wait…' : mode === 'signup' ? `Create ${role === 'owner' ? 'shop owner' : 'customer'} account` : 'Sign in'}
            </Button>
          </form>
          <p className="auth-security"><ShieldCheck /> {isStaticDemo ? 'Demo accounts and changes stay only in this browser.' : 'Passwords are securely hashed and sessions stay private to this browser.'}</p>
        </div>
      </section>
    </div>
  );
}

export function BrandIcon({ compact = false }: { compact?: boolean }) {
  return <span className={compact ? 'brand-icon compact' : 'brand-icon'} aria-hidden="true"><i /><b>TG</b><em>//</em></span>;
}
