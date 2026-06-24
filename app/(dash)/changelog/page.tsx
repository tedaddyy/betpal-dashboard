'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Modal, useToast, timeAgo } from '@/lib/ui';
import type { ChangeEntry, ActivityEntry } from '@/lib/types';

const TYPES = [
  { key: 'feature', label: 'Feature', ico: '✦' },
  { key: 'fix', label: 'Fix', ico: '🔧' },
  { key: 'decision', label: 'Decision', ico: '⚖' },
  { key: 'release', label: 'Release', ico: '🚀' },
  { key: 'marketing', label: 'Marketing', ico: '📣' },
];
const typeMeta = (t: string) => TYPES.find(x => x.key === t) || { label: t, ico: '•' };

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangeEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [adding, setAdding] = useState<{ type: string; title: string; detail: string } | null>(null);
  const { toast, toastNode } = useToast();

  const load = useCallback(() => {
    apiGet<{ entries: ChangeEntry[] }>('/changelog').then(d => setEntries(d.entries)).catch(() => {});
    apiGet<{ activity: ActivityEntry[] }>('/activity').then(d => setActivity(d.activity)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!adding?.title.trim()) return;
    try { await apiPost('/changelog', adding); setAdding(null); load(); toast('Logged'); }
    catch (e: any) { toast(e.message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Activity & change log</h1>
          <div className="page-sub">A running record of what's shipping — features, fixes, decisions, posts.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding({ type: 'feature', title: '', detail: '' })}>+ Log a change</button>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title">Change log</h3>
          {entries.length === 0 ? <div className="empty">Nothing logged yet. Completing a backlog item also lands here.</div> : (
            entries.map(e => (
              <div className="feed-item" key={e.id}>
                <div className="feed-icon">{typeMeta(e.type).ico}</div>
                <div className="feed-body">
                  <div className="feed-text">{e.title}</div>
                  {e.detail && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{e.detail}</div>}
                  <div className="feed-time">{typeMeta(e.type).label} · {timeAgo(e.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Team activity</h3>
          {activity.length === 0 ? <div className="empty">No activity yet.</div> : (
            activity.map(a => (
              <div className="feed-item" key={a.id}>
                <div className="feed-icon">{a.object === 'ai' ? '✦' : a.object === 'idea' ? '💡' : a.object === 'marketing' ? '📣' : a.object === 'todo' ? '☑' : '•'}</div>
                <div className="feed-body">
                  <div className="feed-text">{a.summary}</div>
                  <div className="feed-time">{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {adding && (
        <Modal title="Log a change" onClose={() => setAdding(null)}>
          <div className="field"><label>Type</label>
            <select className="select" value={adding.type} onChange={(e) => setAdding({ ...adding, type: e.target.value })}>
              {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select></div>
          <div className="field"><label>What changed?</label>
            <input className="input" autoFocus value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} placeholder="Shipped per-leg CLV in tracker" /></div>
          <div className="field"><label>Detail (optional)</label>
            <textarea className="textarea" value={adding.detail} onChange={(e) => setAdding({ ...adding, detail: e.target.value })} /></div>
          <button className="btn btn-primary" onClick={save}>Log it</button>
        </Modal>
      )}
      {toastNode}
    </>
  );
}
