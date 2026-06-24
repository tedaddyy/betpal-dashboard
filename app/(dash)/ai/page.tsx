'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { useToast, platformLabel, platformIco, timeAgo } from '@/lib/ui';
import type { AiDraft } from '@/lib/types';

export default function AiQueuePage() {
  const [drafts, setDrafts] = useState<AiDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [focus, setFocus] = useState('');
  const { toast, toastNode } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    apiGet<{ drafts: AiDraft[] }>('/ai/drafts?status=pending')
      .then(d => setDrafts(d.drafts)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function generate(kind: 'todos' | 'marketing') {
    setBusy(kind);
    try {
      const r = await apiPost<{ drafts: any[] }>(`/ai/draft-${kind}`, { focus });
      toast(`Drafted ${r.drafts.length} ${kind === 'todos' ? 'backlog items' : 'posts'}`);
      setFocus(''); load();
    } catch (e: any) { toast(e.message || 'AI draft failed — is ANTHROPIC_API_KEY set?'); }
    finally { setBusy(null); }
  }

  async function review(id: number, action: 'approve' | 'reject') {
    await apiPost(`/ai/drafts/${id}/${action}`);
    setDrafts(prev => prev.filter(d => d.id !== id));
    toast(action === 'approve' ? 'Approved ✓' : 'Rejected');
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">AI Queue</h1>
          <div className="page-sub">Claude drafts backlog items & marketing posts. You approve before anything goes live — nothing is auto-applied.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 className="card-title">Generate fresh drafts</h3>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0, flex: 3 }}>
            <label>Focus (optional)</label>
            <input className="input" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. AFL finals, onboarding drop-off, TikTok growth" />
          </div>
          <button className="btn btn-primary" style={{ flex: '0 0 auto' }} disabled={!!busy} onClick={() => generate('todos')}>{busy === 'todos' ? <span className="spinner" /> : '✦ Backlog ideas'}</button>
          <button className="btn btn-primary" style={{ flex: '0 0 auto' }} disabled={!!busy} onClick={() => generate('marketing')}>{busy === 'marketing' ? <span className="spinner" /> : '✦ Marketing posts'}</button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>Drafts respect BetPal's rules: real data only, no fabricated odds, 18+/responsible-gambling framing.</p>
      </div>

      <h3 className="card-title">Pending review {drafts.length > 0 && `(${drafts.length})`}</h3>
      {loading ? <div className="empty"><span className="spinner" /></div>
        : drafts.length === 0 ? <div className="empty">Nothing pending. Generate some drafts above.</div>
          : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {drafts.map(d => {
                let p: any = {}; try { p = JSON.parse(d.payload); } catch { }
                return (
                  <div key={d.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span className="chip accent">✦ {d.kind === 'todo' ? 'Backlog' : 'Marketing'}</span>
                      <span className="feed-time">{timeAgo(d.created_at)}</span>
                    </div>
                    {d.kind === 'todo' ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                        <div className="muted" style={{ fontSize: 13, margin: '6px 0' }}>{p.detail}</div>
                        <div className="task-meta">
                          <span className={`chip pill-${p.priority || 'p2'}`}>{(p.priority || 'p2').toUpperCase()}</span>
                          <span className="chip">{p.category || 'product'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                          <span>{platformIco(p.platform)}</span><b>{platformLabel(p.platform)}</b>
                          {p.scheduled_for && <span className="chip" style={{ marginLeft: 'auto' }}>{p.scheduled_for}</span>}
                        </div>
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                        <div className="muted" style={{ fontSize: 13, margin: '6px 0', whiteSpace: 'pre-wrap' }}>{p.body}</div>
                        {p.hashtags && <div className="chip">{p.hashtags}</div>}
                      </>
                    )}
                    <div className="row" style={{ marginTop: 14 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => review(d.id, 'approve')}>Approve</button>
                      <button className="btn btn-ghost btn-sm" style={{ flex: '0 0 auto' }} onClick={() => review(d.id, 'reject')}>Reject</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      {toastNode}
    </>
  );
}
