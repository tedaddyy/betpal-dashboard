'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Modal, useToast, initials } from '@/lib/ui';
import type { User } from '@/lib/types';

interface Invite { id: number; email: string; role: string; expires_at: string; }

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviting, setInviting] = useState<{ email: string; role: string } | null>(null);
  const [inviteResult, setInviteResult] = useState<{ email: string; inviteUrl: string; emailed: boolean; emailError: string | null } | null>(null);
  const [sending, setSending] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '' });
  const { toast, toastNode } = useToast();

  const isAdmin = user && (user.role === 'owner' || user.role === 'admin');

  const load = useCallback(() => {
    apiGet<{ members: User[]; invites: Invite[] }>('/team').then(d => { setMembers(d.members); setInvites(d.invites); }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function sendInvite() {
    if (!inviting?.email.trim()) return;
    setSending(true);
    try {
      const r = await apiPost<{ inviteUrl: string; emailed: boolean; emailError: string | null }>('/team/invite', inviting);
      setInviteResult({ email: inviting.email.trim(), inviteUrl: r.inviteUrl, emailed: r.emailed, emailError: r.emailError });
      setInviting(null); load();
    } catch (e: any) { toast(e.message); }
    finally { setSending(false); }
  }
  async function changeRole(m: User, role: string) {
    await apiPatch(`/team/${m.id}/role`, { role }); load();
  }
  async function disable(m: User) {
    if (!confirm(`Remove ${m.name || m.email} from the team?`)) return;
    await apiDelete(`/team/${m.id}`); load();
  }
  async function changePw() {
    if (pw.next.length < 8) { toast('New password must be 8+ chars'); return; }
    try { await apiPost('/me/password', { current: pw.current, next: pw.next }); setPwModal(false); setPw({ current: '', next: '' }); toast('Password updated'); }
    catch (e: any) { toast(e.message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Team</h1>
          <div className="page-sub">Manage who can access Mission Control and what they can do.</div>
        </div>
        <div className="section-actions">
          <button className="btn btn-ghost" onClick={() => setPwModal(true)}>Change my password</button>
          {isAdmin && <button className="btn btn-primary" onClick={() => setInviting({ email: '', role: 'contributor' })}>+ Invite teammate</button>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Members</h3>
        {members.map(m => (
          <div key={m.id} className="list-row">
            <div className="avatar" style={{ background: m.avatarColor }}>{initials(m.name, m.email)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{m.name || m.email}{m.id === user?.id && <span className="muted"> (you)</span>}</div>
              <div className="muted" style={{ fontSize: 12 }}>{m.email}{m.status === 'invited' && ' · invite pending'}</div>
            </div>
            {isAdmin && m.role !== 'owner' && m.status === 'active' ? (
              <select className="select" style={{ width: 'auto' }} value={m.role} onChange={(e) => changeRole(m, e.target.value)}>
                <option value="admin">admin</option>
                <option value="contributor">contributor</option>
              </select>
            ) : <span className="chip accent" style={{ textTransform: 'capitalize' }}>{m.role}</span>}
            {isAdmin && m.role !== 'owner' && m.id !== user?.id && (
              <button className="btn btn-danger btn-sm" onClick={() => disable(m)}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div className="card">
          <h3 className="card-title">Pending invites</h3>
          {invites.map(i => (
            <div key={i.id} className="list-row">
              <div className="feed-icon">✉</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{i.email}</div><div className="muted" style={{ fontSize: 12 }}>{i.role} · expires {new Date(i.expires_at).toLocaleDateString()}</div></div>
            </div>
          ))}
        </div>
      )}

      {inviting && (
        <Modal title="Invite a teammate" onClose={() => setInviting(null)}>
          <div className="field"><label>Email</label>
            <input className="input" type="email" autoFocus value={inviting.email} onChange={(e) => setInviting({ ...inviting, email: e.target.value })} placeholder="teammate@betpal.app" /></div>
          <div className="field"><label>Role</label>
            <select className="select" value={inviting.role} onChange={(e) => setInviting({ ...inviting, role: e.target.value })}>
              <option value="contributor">Contributor — can add & edit content</option>
              <option value="admin">Admin — can also manage team & metrics</option>
            </select></div>
          <button className="btn btn-primary" onClick={sendInvite} disabled={sending}>{sending ? <span className="spinner" /> : 'Send invite'}</button>
        </Modal>
      )}

      {inviteResult && (
        <Modal title={inviteResult.emailed ? 'Invite sent' : 'Invite link ready'} onClose={() => setInviteResult(null)}>
          {inviteResult.emailed ? (
            <p style={{ marginTop: 0, fontSize: 14 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓ Emailed to {inviteResult.email}</span>
              <br /><span className="muted" style={{ fontSize: 13 }}>They'll get a branded invite with a link to join (expires in 7 days). You can also copy the link below.</span>
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
              {inviteResult.emailError === 'email_not_configured'
                ? 'Email isn’t set up yet, so copy this link and send it to your teammate. It expires in 7 days.'
                : 'Couldn’t send the email — copy this link and send it to your teammate instead. It expires in 7 days.'}
            </p>
          )}
          <div className="field"><input className="input" readOnly value={inviteResult.inviteUrl} onFocus={(e) => e.target.select()} /></div>
          <button className="btn btn-primary" onClick={() => { navigator.clipboard?.writeText(inviteResult.inviteUrl); toast('Copied'); }}>Copy link</button>
        </Modal>
      )}

      {pwModal && (
        <Modal title="Change password" onClose={() => setPwModal(false)}>
          <div className="field"><label>Current password</label>
            <input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
          <div className="field"><label>New password</label>
            <input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="At least 8 characters" /></div>
          <button className="btn btn-primary" onClick={changePw}>Update password</button>
        </Modal>
      )}
      {toastNode}
    </>
  );
}
