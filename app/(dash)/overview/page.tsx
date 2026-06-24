'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { platformIco } from '@/lib/ui';
import type { Metric } from '@/lib/types';

interface Overview {
  metrics: Metric[];
  todoCounts: Record<string, number>;
  attention: { id: number; title: string; priority: string; status: string }[];
  upcomingPosts: { id: number; platform: string; title: string; scheduled_for: string; status: string }[];
  pendingDrafts: number;
  topIdeas: { id: number; title: string; votes: number }[];
}

function fmtValue(m: Metric) {
  const n = Number(m.value);
  const num = isNaN(n) ? m.value : n.toLocaleString();
  return m.unit === '$' ? `$${num}` : `${num}${m.unit && m.unit !== '$' ? '' : ''}`;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => { apiGet<Overview>('/overview').then(setData).catch(() => {}); }, []);

  if (!data) return <div className="empty"><span className="spinner" /></div>;
  const openTodos = (data.todoCounts.backlog || 0) + (data.todoCounts.todo || 0) + (data.todoCounts.in_progress || 0) + (data.todoCounts.review || 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Business overview</h1>
          <div className="page-sub">Hey {user?.name?.split(' ')[0] || 'there'} — here's the health of BetPal at a glance.</div>
        </div>
        {data.pendingDrafts > 0 && (
          <Link href="/ai" className="btn btn-primary btn-sm">✦ {data.pendingDrafts} AI draft{data.pendingDrafts > 1 ? 's' : ''} to review</Link>
        )}
      </div>

      <div className="grid grid-metrics" style={{ marginBottom: 18 }}>
        {data.metrics.map((m) => (
          <div className="metric" key={m.mkey}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">
              {m.unit === '$' && <span className="metric-unit">$</span>}
              {Number(m.value) ? Number(m.value).toLocaleString() : m.value}
              {m.unit && m.unit !== '$' && <span className="metric-unit">{m.unit}</span>}
            </div>
            {m.trend != null ? (
              <div className={`metric-trend ${m.trend > 0 ? 'trend-up' : m.trend < 0 ? 'trend-down' : 'trend-flat'}`}>
                {m.trend > 0 ? '▲' : m.trend < 0 ? '▼' : '—'} {Math.abs(m.trend)}% vs last period
              </div>
            ) : <div className="metric-trend trend-flat">— no trend yet</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 className="card-title">Needs attention</h3>
            {data.attention.length === 0 ? <div className="empty">Nothing on fire 🎉 No P0/P1 items open.</div> : (
              data.attention.map((a) => (
                <Link href="/backlog" key={a.id} className="list-row" style={{ cursor: 'pointer' }}>
                  <span className={`chip pill-${a.priority}`}>{a.priority.toUpperCase()}</span>
                  <span style={{ flex: 1 }}>{a.title}</span>
                  <span className="chip">{a.status.replace('_', ' ')}</span>
                </Link>
              ))
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Backlog snapshot</h3>
            <div className="row" style={{ gap: 8 }}>
              {[['backlog', 'Backlog'], ['todo', 'To do'], ['in_progress', 'In progress'], ['review', 'Review'], ['done', 'Done']].map(([k, l]) => (
                <div key={k} style={{ textAlign: 'center', background: 'var(--surface-light)', borderRadius: 10, padding: '10px 6px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{data.todoCounts[k] || 0}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{l}</div>
                </div>
              ))}
            </div>
            <Link href="/backlog" className="btn btn-ghost btn-sm" style={{ marginTop: 14 }}>Open backlog →</Link>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 className="card-title">Upcoming posts</h3>
            {data.upcomingPosts.length === 0 ? <div className="empty">No scheduled posts. <Link href="/marketing" style={{ color: 'var(--accent)' }}>Plan some →</Link></div> : (
              data.upcomingPosts.map((p) => (
                <Link href="/marketing" key={p.id} className="list-row" style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: 16 }}>{platformIco(p.platform)}</span>
                  <span style={{ flex: 1 }}>{p.title}</span>
                  <span className="chip">{p.scheduled_for}</span>
                </Link>
              ))
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Top ideas</h3>
            {data.topIdeas.length === 0 ? <div className="empty">No ideas yet. <Link href="/ideas" style={{ color: 'var(--accent)' }}>Start the board →</Link></div> : (
              data.topIdeas.map((i) => (
                <Link href="/ideas" key={i.id} className="list-row" style={{ cursor: 'pointer' }}>
                  <span className="chip accent">▲ {i.votes}</span>
                  <span style={{ flex: 1 }}>{i.title}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="rg-note">
        Standing rules: real data only — never fabricate odds, results, or predictions. Keep all
        member-facing copy 18+ and responsibly framed.
      </p>
    </>
  );
}
