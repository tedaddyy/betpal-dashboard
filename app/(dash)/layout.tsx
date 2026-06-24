'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import { initials } from '@/lib/ui';
import DeployButton from '@/lib/DeployButton';

const NAV = [
  { href: '/overview', label: 'Overview', ico: '◎' },
  { href: '/backlog', label: 'Backlog', ico: '☑' },
  { href: '/marketing', label: 'Marketing', ico: '📣' },
  { href: '/social', label: 'Social Posts', ico: '🎨' },
  { href: '/log', label: 'Log Calendar', ico: '🗓' },
  { href: '/changelog', label: 'Activity', ico: '⟳' },
  { href: '/ideas', label: 'Ideas', ico: '💡' },
  { href: '/ai', label: 'AI Queue', ico: '✦', badgeKey: 'pendingDrafts' },
  { href: '/team', label: 'Team', ico: '👥' },
];

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(0);

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () => apiGet<{ pendingDrafts: number }>('/overview')
      .then((d) => { if (alive) setPending(d.pendingDrafts || 0); }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [user, pathname]);

  if (loading || !user) return <div className="auth-wrap"><span className="spinner" /></div>;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-icon.png" className="brand-mark" alt="BetPal" />
          <div>
            <div className="brand-name wordmark"><span>Bet</span><span className="pal">Pal</span></div>
            <div className="brand-sub">Mission Control</div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/');
            return (
              <Link key={n.href} href={n.href} className={`nav-link${active ? ' active' : ''}`}>
                <span className="ico">{n.ico}</span>
                <span>{n.label}</span>
                {n.badgeKey === 'pendingDrafts' && pending > 0 && <span className="nav-badge">{pending}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 10 }}><DeployButton /></div>
          <div className="user-chip">
            <div className="avatar" style={{ background: user.avatarColor }}>{initials(user.name, user.email)}</div>
            <div className="user-meta">
              <div className="user-name">{user.name || user.email}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
