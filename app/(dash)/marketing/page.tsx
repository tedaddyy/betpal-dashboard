'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Modal, useToast, PLATFORMS, platformIco, platformLabel } from '@/lib/ui';
import type { MarketingItem } from '@/lib/types';

const STATUSES: MarketingItem['status'][] = ['idea', 'draft', 'scheduled', 'posted', 'skipped'];
const blank = { platform: 'x', title: '', body: '', hashtags: '', scheduled_for: '', status: 'idea' as MarketingItem['status'] };

function startOfWeek(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
function iso(d: Date) { return d.toISOString().slice(0, 10); }

export default function MarketingPage() {
  const [items, setItems] = useState<MarketingItem[]>([]);
  const [editing, setEditing] = useState<Partial<MarketingItem> | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiFocus, setAiFocus] = useState('');
  const [showAi, setShowAi] = useState(false);
  const { toast, toastNode } = useToast();

  const load = useCallback(() => { apiGet<{ items: MarketingItem[] }>('/marketing').then(d => setItems(d.items)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing?.title?.trim()) return;
    try {
      if (editing.id) await apiPatch(`/marketing/${editing.id}`, editing);
      else await apiPost('/marketing', editing);
      setEditing(null); load(); toast('Saved');
    } catch (e: any) { toast(e.message); }
  }
  async function remove(id: number) { if (!confirm('Delete this post?')) return; await apiDelete(`/marketing/${id}`); setEditing(null); load(); }

  async function runAi() {
    setAiBusy(true);
    try {
      const r = await apiPost<{ drafts: any[] }>('/ai/draft-marketing', { focus: aiFocus });
      toast(`AI drafted ${r.drafts.length} posts → review in AI Queue`);
      setShowAi(false); setAiFocus('');
    } catch (e: any) { toast(e.message || 'AI draft failed'); }
    finally { setAiBusy(false); }
  }

  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const todayIso = iso(new Date());

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Marketing</h1>
          <div className="page-sub">The evolving content plan — what to post, where, and when. Honest promotion only; never fabricate odds or results.</div>
        </div>
        <div className="section-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}>{view === 'calendar' ? '☰ List' : '▦ Calendar'}</button>
          <button className="btn" onClick={() => setShowAi(true)}>✦ AI plan</button>
          <button className="btn btn-primary" onClick={() => setEditing({ ...blank, scheduled_for: todayIso })}>+ New post</button>
        </div>
      </div>

      {view === 'calendar' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}>← Prev</button>
            <span className="muted" style={{ fontSize: 13 }}>{weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {days[13].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}>Next →</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
          </div>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].length > 0 && (
            <div className="cal" style={{ marginBottom: 8 }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="cal-head">{d}</div>)}
            </div>
          )}
          <div className="cal">
            {days.map((d) => {
              const di = iso(d);
              const posts = items.filter(i => i.scheduled_for === di);
              return (
                <div key={di} className={`cal-cell${di === todayIso ? ' today' : ''}`}
                  onDoubleClick={() => setEditing({ ...blank, scheduled_for: di })}>
                  <div className="cal-date">{d.getDate()}</div>
                  {posts.map(p => (
                    <div key={p.id} className="cal-post" onClick={() => setEditing(p)}
                      style={{ borderLeftColor: `var(--${p.platform})`, opacity: p.status === 'posted' ? 0.65 : 1 }}>
                      {platformIco(p.platform)} {p.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Double-click a day to add a post. Colours = platform.</p>
        </>
      ) : (
        <div className="card">
          {items.length === 0 ? <div className="empty">No posts yet.</div> : items.map(p => (
            <div key={p.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => setEditing(p)}>
              <span style={{ fontSize: 16, width: 22 }}>{platformIco(p.platform)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>{platformLabel(p.platform)}{p.scheduled_for ? ` · ${p.scheduled_for}` : ''}{p.source === 'ai' ? ' · ✦ AI' : ''}</div>
              </div>
              <span className={`chip${p.status === 'posted' ? ' accent' : ''}`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit post' : 'New post'} onClose={() => setEditing(null)}>
          <div className="row">
            <div className="field"><label>Platform</label>
              <select className="select" value={editing.platform} onChange={(e) => setEditing({ ...editing, platform: e.target.value })}>
                {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select></div>
            <div className="field"><label>Status</label>
              <select className="select" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
          <div className="field"><label>Hook / title</label>
            <input className="input" value={editing.title || ''} autoFocus onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Scroll-stopping hook" /></div>
          <div className="field"><label>Post copy</label>
            <textarea className="textarea" value={editing.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="The actual caption / copy" /></div>
          <div className="row">
            <div className="field"><label>Hashtags</label>
              <input className="input" value={editing.hashtags || ''} onChange={(e) => setEditing({ ...editing, hashtags: e.target.value })} placeholder="#AFL #betting" /></div>
            <div className="field"><label>Date</label>
              <input className="input" type="date" value={editing.scheduled_for || ''} onChange={(e) => setEditing({ ...editing, scheduled_for: e.target.value })} /></div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={save}>{editing.id ? 'Save' : 'Add'}</button>
            {editing.id && <button className="btn btn-danger" style={{ flex: '0 0 auto' }} onClick={() => remove(editing.id!)}>Delete</button>}
            <button className="btn btn-ghost" style={{ flex: '0 0 auto' }} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {showAi && (
        <Modal title="✦ AI marketing plan" onClose={() => setShowAi(false)}>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Claude drafts platform-native posts across X, Instagram, TikTok and Reddit for the next ~2 weeks.
            Nothing is published — drafts land in the <b>AI Queue</b> for you to approve.
          </p>
          <div className="field"><label>Campaign focus (optional)</label>
            <input className="input" value={aiFocus} onChange={(e) => setAiFocus(e.target.value)} placeholder="e.g. AFL finals push, free odds-comparison angle" /></div>
          <button className="btn btn-primary" onClick={runAi} disabled={aiBusy}>{aiBusy ? <span className="spinner" /> : 'Generate drafts'}</button>
        </Modal>
      )}
      {toastNode}
    </>
  );
}
