'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getToken } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (getToken()) router.replace('/overview'); }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await login(email, password);
      router.replace('/overview');
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand" style={{ padding: '0 0 22px' }}>
          <img src="/logo-icon.png" className="brand-mark brand-mark-lg" alt="BetPal" />
          <div>
            <div className="brand-name wordmark wordmark-lg"><span>Bet</span><span className="pal">Pal</span></div>
            <div className="brand-sub">Mission Control</div>
          </div>
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Welcome back</h2>
        <p className="muted" style={{ margin: '0 0 20px', fontSize: 13 }}>Sign in to the team command centre.</p>

        <div className="field">
          <label>Email</label>
          <input className="input" type="email" value={email} autoComplete="username"
            onChange={(e) => setEmail(e.target.value)} placeholder="you@betpal.app" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" value={password} autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
          {busy ? <span className="spinner" /> : 'Sign in'}
        </button>
        <p className="rg-note">BetPal compares real bookmaker odds and tracks bets. 18+ · Gamble responsibly.</p>
      </form>
    </div>
  );
}
