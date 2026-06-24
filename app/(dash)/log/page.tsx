'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import { Modal, timeAgo } from '@/lib/ui';
import type { ActivityEntry } from '@/lib/types';

// Event categories (by activity.object) → label / icon / colour.
const CAT: Record<string, { label: string; icon: string; color: string }> = {
  app: { label: 'App change', icon: '🛠', color: '#0F8FE0' },
  claude: { label: 'Claude', icon: '✦', color: '#7A5AF8' },
  deploy: { label: 'Deploy', icon: '⬆', color: '#00B36F' },
  idea: { label: 'Idea', icon: '💡', color: '#B5790A' },
  todo: { label: 'Backlog', icon: '☑', color: '#0B8A5B' },
  marketing: { label: 'Marketing', icon: '📣', color: '#E1306C' },
  social: { label: 'Social', icon: '🎨', color: '#11B5AD' },
  changelog: { label: 'Changelog', icon: '🚀', color: '#0BA06A' },
  team: { label: 'Team', icon: '👥', color: '#45554F' },
  metric: { label: 'Metric', icon: '📈', color: '#0B8A5B' },
  ai: { label: 'AI', icon: '✦', color: '#0B8A5B' },
};
const catOf = (object: string) => CAT[object] || { label: object, icon: '•', color: '#6B7775' };
const CAT_KEYS = Object.keys(CAT);

// Normalize a stored timestamp (ISO, or SQLite "YYYY-MM-DD HH:MM:SS" UTC) to a Date.
function toDate(iso: string) {
  return new Date(iso.includes('T') || iso.includes('Z') ? iso : iso.replace(' ', 'T') + 'Z');
}
function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function LogPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [events, setEvents] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Set<string>>(new Set(CAT_KEYS));
  const [openDay, setOpenDay] = useState<string | null>(null);

  // The visible 6-week grid (Mon-first) covering this month.
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // back to Monday
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  const load = useCallback(() => {
    setLoading(true);
    const from = new Date(grid[0]); from.setHours(0, 0, 0, 0);
    const to = new Date(grid[41]); to.setHours(0, 0, 0, 0); to.setDate(to.getDate() + 1);
    apiGet<{ events: ActivityEntry[] }>(`/log?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`)
      .then(d => setEvents(d.events)).catch(() => {}).finally(() => setLoading(false));
  }, [grid]);
  useEffect(() => { load(); }, [load]);

  // Group filtered events by local day.
  const byDay = useMemo(() => {
    const map: Record<string, ActivityEntry[]> = {};
    for (const e of events) {
      if (!active.has(e.object) && CAT_KEYS.includes(e.object)) continue;
      const k = localKey(toDate(e.created_at));
      (map[k] ||= []).push(e);
    }
    return map;
  }, [events, active]);

  const monthIdx = cursor.getMonth();
  const todayKey = localKey(new Date());
  const total = useMemo(() => Object.values(byDay).reduce((n, a) => n + a.length, 0), [byDay]);

  function toggle(k: string) {
    setActive(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Log calendar</h1>
          <div className="page-sub">Everything that happened, by day — ideas, backlog moves, posts, team changes, and app/Claude commits. Updates automatically.</div>
        </div>
        <div className="section-actions" style={{ alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
          <span style={{ fontWeight: 700, minWidth: 150, textAlign: 'center' }}>
            {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</button>
        </div>
      </div>

      {/* Category filter legend */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {CAT_KEYS.map(k => {
          const c = CAT[k]; const on = active.has(k);
          return (
            <button key={k} onClick={() => toggle(k)} className="chip"
              style={{ cursor: 'pointer', opacity: on ? 1 : 0.4, borderColor: on ? c.color : 'var(--border)', color: on ? c.color : 'var(--text-muted)' }}>
              <span>{c.icon}</span> {c.label}
            </button>
          );
        })}
        <span className="muted" style={{ fontSize: 12, alignSelf: 'center', marginLeft: 'auto' }}>
          {loading ? <span className="spinner" /> : `${total} event${total === 1 ? '' : 's'} this view`}
        </span>
      </div>

      <div className="cal" style={{ marginBottom: 6 }}>
        {WEEKDAYS.map(d => <div key={d} className="cal-head">{d}</div>)}
      </div>
      <div className="cal">
        {grid.map((d) => {
          const k = localKey(d);
          const dayEvents = byDay[k] || [];
          const dim = d.getMonth() !== monthIdx;
          return (
            <div key={k} className={`cal-cell${dim ? ' dim' : ''}${k === todayKey ? ' today' : ''}`}
              style={{ minHeight: 116, cursor: dayEvents.length ? 'pointer' : 'default' }}
              onClick={() => dayEvents.length && setOpenDay(k)}>
              <div className="cal-date">{d.getDate()}</div>
              {dayEvents.slice(0, 3).map(e => {
                const c = catOf(e.object);
                return (
                  <div key={e.id} className="cal-post" title={e.summary}
                    style={{ borderLeftColor: c.color }}>
                    {c.icon} {e.summary}
                  </div>
                );
              })}
              {dayEvents.length > 3 && <div className="muted" style={{ fontSize: 10, fontWeight: 600 }}>+{dayEvents.length - 3} more</div>}
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        App &amp; Claude commits flow in automatically via a git hook (see DEPLOY.md). Click a day to see everything.
      </p>

      {openDay && (
        <Modal title={new Date(openDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} onClose={() => setOpenDay(null)}>
          {(byDay[openDay] || []).slice().sort((a, b) => toDate(b.created_at).getTime() - toDate(a.created_at).getTime()).map(e => {
            const c = catOf(e.object);
            return (
              <div key={e.id} className="feed-item">
                <div className="feed-icon" style={{ borderColor: c.color }}>{c.icon}</div>
                <div className="feed-body">
                  <div className="feed-text">{e.summary}</div>
                  <div className="feed-time">{c.label} · {toDate(e.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {timeAgo(e.created_at)}</div>
                </div>
              </div>
            );
          })}
        </Modal>
      )}
    </>
  );
}
