'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { Modal, useToast, timeAgo, initials } from '@/lib/ui';
import type { Idea, IdeaComment } from '@/lib/types';

const STATUS = ['open', 'planned', 'shipped', 'archived'];

// Where a generated implementation prompt should go.
const TOOLS: Record<string, { label: string; ico: string; href?: string; blurb: string }> = {
  claude_code: { label: 'Claude Code', ico: '⌘', blurb: 'Build it — paste into Claude Code in the betmate / betpal-backend repo.' },
  claude_design: { label: 'Claude Design', ico: '✎', href: 'https://claude.ai/design', blurb: 'Design it — open Claude Design and paste the prompt.' },
  claude_cowork: { label: 'Claude Cowork', ico: '⊞', href: 'https://claude.ai', blurb: 'Run it — paste into Claude Cowork (research / marketing / ops).' },
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [adding, setAdding] = useState<{ title: string; body: string } | null>(null);
  const [open, setOpen] = useState<Idea | null>(null);
  const [implBusy, setImplBusy] = useState(false);
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [comment, setComment] = useState('');
  const { toast, toastNode } = useToast();

  const load = useCallback(() => { apiGet<{ ideas: Idea[] }>('/ideas').then(d => setIdeas(d.ideas)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const openIdea = useCallback((i: Idea) => {
    setOpen(i); setComments([]);
    apiGet<{ comments: IdeaComment[] }>(`/ideas/${i.id}/comments`).then(d => setComments(d.comments)).catch(() => {});
  }, []);

  async function vote(i: Idea, e: React.MouseEvent) {
    e.stopPropagation();
    const r = await apiPost<{ voted: boolean; votes: number }>(`/ideas/${i.id}/vote`);
    setIdeas(prev => prev.map(x => x.id === i.id ? { ...x, votes: r.votes, voted: r.voted ? 1 : 0 } : x));
    if (open?.id === i.id) setOpen({ ...open, votes: r.votes, voted: r.voted ? 1 : 0 });
  }
  async function add() {
    if (!adding?.title.trim()) return;
    try { await apiPost('/ideas', adding); setAdding(null); load(); toast('Idea posted'); }
    catch (e: any) { toast(e.message); }
  }
  async function postComment() {
    if (!comment.trim() || !open) return;
    await apiPost(`/ideas/${open.id}/comments`, { body: comment });
    const d = await apiGet<{ comments: IdeaComment[] }>(`/ideas/${open.id}/comments`);
    setComments(d.comments); setComment('');
    setIdeas(prev => prev.map(x => x.id === open.id ? { ...x, comment_count: x.comment_count + 1 } : x));
  }
  async function setStatus(s: string) {
    if (!open) return;
    await apiPatch(`/ideas/${open.id}`, { status: s });
    setOpen({ ...open, status: s }); load();
  }
  async function genImpl() {
    if (!open) return;
    setImplBusy(true);
    try {
      const { idea } = await apiPost<{ idea: Idea }>(`/ideas/${open.id}/implementation-prompt`);
      setOpen(idea);
      setIdeas(prev => prev.map(x => x.id === idea.id ? { ...x, ...idea } : x));
    } catch (e: any) { toast(e.message || 'Could not generate prompt'); }
    finally { setImplBusy(false); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Ideas board</h1>
          <div className="page-sub">Post ideas to the team, discuss, and vote the best ones up.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding({ title: '', body: '' })}>+ New idea</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {ideas.length === 0 && <div className="empty">No ideas yet — be the first to post one.</div>}
        {ideas.map(i => (
          <div key={i.id} className="card" style={{ cursor: 'pointer', display: 'flex', gap: 12 }} onClick={() => openIdea(i)}>
            <button className={`btn btn-sm${i.voted ? ' btn-primary' : ' btn-ghost'}`} style={{ flexDirection: 'column', alignItems: 'center', padding: '6px 10px', alignSelf: 'flex-start' }} onClick={(e) => vote(i, e)}>
              <span>▲</span><span>{i.votes}</span>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{i.title}</div>
                {i.status !== 'open' && <span className="chip accent">{i.status}</span>}
              </div>
              {i.body && <div className="muted" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{i.body}</div>}
              <div className="feed-time" style={{ marginTop: 8 }}>💬 {i.comment_count} · {timeAgo(i.created_at)}</div>
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <Modal title="New idea" onClose={() => setAdding(null)}>
          <div className="field"><label>Title</label>
            <input className="input" autoFocus value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} placeholder="What's the idea?" /></div>
          <div className="field"><label>Details</label>
            <textarea className="textarea" value={adding.body} onChange={(e) => setAdding({ ...adding, body: e.target.value })} placeholder="Pitch it to the team…" /></div>
          <button className="btn btn-primary" onClick={add}>Post idea</button>
        </Modal>
      )}

      {open && (
        <Modal title={open.title} onClose={() => setOpen(null)}>
          {open.body && <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>{open.body}</p>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm${open.voted ? ' btn-primary' : ''}`} onClick={(e) => vote(open, e)}>▲ {open.votes} vote{open.votes === 1 ? '' : 's'}</button>
            <select className="select" style={{ width: 'auto' }} value={open.status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <h4 className="card-title">Discussion</h4>
          {comments.length === 0 && <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>No comments yet.</div>}
          {comments.map(c => (
            <div key={c.id} className="feed-item">
              <div className="avatar" style={{ background: c.avatar_color || 'var(--accent)', width: 28, height: 28, fontSize: 12 }}>{initials(c.author_name)}</div>
              <div className="feed-body">
                <div style={{ fontSize: 13 }}><b>{c.author_name || 'Teammate'}</b> <span className="feed-time" style={{ display: 'inline' }}>· {timeAgo(c.created_at)}</span></div>
                <div style={{ fontSize: 14 }}>{c.body}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" onKeyDown={(e) => { if (e.key === 'Enter') postComment(); }} />
            <button className="btn btn-primary" style={{ flex: '0 0 auto' }} onClick={postComment}>Send</button>
          </div>

          {/* Turn the idea + discussion into a ready-to-run implementation prompt */}
          <div style={{ borderTop: '1px solid var(--divider)', marginTop: 18, paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <h4 className="card-title" style={{ margin: 0 }}>Ship it</h4>
              <button className="btn btn-primary btn-sm" onClick={genImpl} disabled={implBusy}>
                {implBusy ? <span className="spinner" /> : (open.impl_prompt ? '↻ Regenerate prompt' : '✦ Generate implementation prompt')}
              </button>
            </div>
            {!open.impl_prompt && !implBusy && (
              <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                Claude reads the idea + this discussion, picks the right tool (Claude Code, Design, or Cowork), and writes a prompt you can paste straight in.
              </p>
            )}
            {open.impl_prompt && open.impl_tool && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="chip accent">{TOOLS[open.impl_tool]?.ico} {TOOLS[open.impl_tool]?.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{open.impl_reason}</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{TOOLS[open.impl_tool]?.blurb}</div>
                <textarea className="textarea" readOnly value={open.impl_prompt} style={{ minHeight: 160, fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace' }} onFocus={(e) => e.target.select()} />
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard?.writeText(open.impl_prompt || ''); toast('Prompt copied'); }}>Copy prompt</button>
                  {TOOLS[open.impl_tool]?.href && (
                    <a className="btn btn-ghost btn-sm" style={{ flex: '0 0 auto' }} href={TOOLS[open.impl_tool]!.href} target="_blank" rel="noreferrer">Open {TOOLS[open.impl_tool]?.label} ↗</a>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
      {toastNode}
    </>
  );
}
