'use client';

import { useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { btn, inputCls } from '@/components/seller/ui';

export default function SellerLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/seller/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || 'Login gagal.');
      const next = new URLSearchParams(window.location.search).get('next') || '/seller';
      window.location.href = next.startsWith('/seller') ? next : '/seller';
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cobalt-900 px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-7 shadow-2xl">
        <BrandLogo />
        <h1 className="mt-5 text-xl font-extrabold text-ink">Seller Center</h1>
        <p className="mt-1 text-sm text-slate-500">Masuk dengan akun admin toko.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">Username</span>
            <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">Password</span>
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className={`${btn.primary} w-full py-3`}>
            {loading ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">Lupa password? Minta pemilik akun mengganti di admin Django.</p>
      </div>
    </div>
  );
}
