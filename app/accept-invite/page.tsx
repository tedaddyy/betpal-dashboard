'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost, setToken } from '@/lib/api';

function AcceptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [info, setInfo] = useState<{ email: string; role: string } | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setErr('No invite token'); return; }
    apiGet<{ email: string; role: string }>(`/auth/invite/${token}`)
      .then(setInfo)
      .catch((e) => setErr(e.message || 'Invite invalid or expired'));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const { token: jwt } = await apiPost<{ token: string }>('/auth/accept-invite', { token, name, password });
      setToken(jwt);
      router.replace('/overview');
    } catch (e: any) {
      setErr(e.message || 'Could not accept invite');
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand" style={{ padding: '0 0 18px' }}>
          <img src="/logo-icon.png" className="brand-mark brand-mark-lg" alt="BetPal" />
          <div><div className="brand-name wordmark wordmark-lg"><span>Bet</span><span className="pal">Pal</span></div><div className="brand-sub">Mission Control</div></div>
        </div>
        {!info && !err && <p className="muted">Checking invite…</p>}
        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        {info && (
          <>
            <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Join the team</h2>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 18px' }}>
              You're invited as <b style={{ color: 'var(--accent)' }}>{info.role}</b> · {info.email}
            </p>
            <div className="field"><label>Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required /></div>
            <div className="field"><label>Choose a password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required /></div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
              {busy ? <span className="spinner" /> : 'Accept & continue'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return <Suspense fallback={<div className="auth-wrap"><span className="spinner" /></div>}><AcceptInner /></Suspense>;
}
