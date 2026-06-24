'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from './api';
import { useAuth } from './auth';
import { Modal, useToast } from './ui';

type DeployTarget = 'dashboard' | 'backend' | 'both';
type Results = Record<string, { ok: boolean; reason?: string; status?: number }>;

// Admin-only "Push live" control — triggers a Render deploy of the latest
// pushed code via secret deploy hooks held on the backend.
export default function DeployButton() {
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'owner' || user.role === 'admin');
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<{ dashboard: boolean; backend: boolean } | null>(null);
  const [target, setTarget] = useState<DeployTarget>('dashboard');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const { toast, toastNode } = useToast();

  const loadCfg = useCallback(() => {
    apiGet<{ dashboard: boolean; backend: boolean }>('/admin/deploy-config')
      .then((c) => { setCfg(c); setTarget(c.dashboard ? 'dashboard' : c.backend ? 'backend' : 'dashboard'); })
      .catch(() => {});
  }, []);
  useEffect(() => { if (isAdmin) loadCfg(); }, [isAdmin, loadCfg]);

  if (!isAdmin) return null;
  const anyConfigured = cfg && (cfg.dashboard || cfg.backend);

  async function deploy() {
    setBusy(true); setResults(null);
    try {
      const r = await apiPost<{ results: Results }>('/admin/deploy', { target });
      setResults(r.results);
      const ok = Object.values(r.results).some((x) => x.ok);
      if (ok) toast('Deploy started — live in ~1–2 min');
    } catch (e: any) { toast(e.message || 'Deploy failed'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}
        onClick={() => { setResults(null); setOpen(true); loadCfg(); }}>
        ⬆ Push live
      </button>

      {open && (
        <Modal title="Push live to production" onClose={() => setOpen(false)}>
          {!anyConfigured ? (
            <>
              <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
                One-click deploys aren’t set up yet. In <b>Render → your service → Settings → Deploy Hook</b>,
                copy the hook URL and add it to the backend’s env as
                <code> RENDER_DEPLOY_HOOK_DASHBOARD</code> (and optionally
                <code> RENDER_DEPLOY_HOOK_BACKEND</code>). Full steps are in <b>DEPLOY.md → Part G</b>.
              </p>
              <button className="btn" onClick={() => setOpen(false)}>Got it</button>
            </>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
                Redeploys the latest <b>pushed</b> code to production (takes ~1–2 min). Make sure your
                changes are committed and pushed to GitHub first.
              </p>
              <div className="field">
                <label>What to deploy</label>
                <select className="select" value={target} onChange={(e) => setTarget(e.target.value as DeployTarget)}>
                  {cfg!.dashboard && <option value="dashboard">Dashboard (web app)</option>}
                  {cfg!.backend && <option value="backend">Backend (API)</option>}
                  {cfg!.dashboard && cfg!.backend && <option value="both">Both</option>}
                </select>
              </div>

              {results && (
                <div style={{ margin: '4px 0 14px' }}>
                  {Object.entries(results).map(([t, r]) => (
                    <div key={t} className="list-row" style={{ padding: '7px 0' }}>
                      <span style={{ color: r.ok ? 'var(--accent)' : 'var(--danger)', fontWeight: 700 }}>{r.ok ? '✓' : '✗'}</span>
                      <span style={{ flex: 1, textTransform: 'capitalize' }}>{t}</span>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {r.ok ? 'deploy started' : r.reason === 'not_configured' ? 'no deploy hook' : 'failed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="row">
                <button className="btn btn-primary" onClick={deploy} disabled={busy}>
                  {busy ? <span className="spinner" /> : '⬆ Deploy now'}
                </button>
                <button className="btn btn-ghost" style={{ flex: '0 0 auto' }} onClick={() => setOpen(false)}>Close</button>
              </div>
            </>
          )}
        </Modal>
      )}
      {toastNode}
    </>
  );
}
