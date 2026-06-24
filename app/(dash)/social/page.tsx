'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Modal, useToast, PLATFORMS, platformLabel } from '@/lib/ui';
import PostCanvas from '@/lib/PostCanvas';
import { downloadPost, FORMATS, type PostSpec } from '@/lib/postRender';
import type { SocialPost } from '@/lib/types';

const TEMPLATES = ['odds', 'stat', 'announce', 'quote'] as const;
const ACCENTS = ['green', 'white', 'dark'] as const;

function specOf(p: SocialPost): PostSpec {
  return { format: p.format, template: p.template, accent: p.accent, headline: p.headline, subtext: p.subtext, cta: p.cta };
}

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);
  const [gen, setGen] = useState({ prompt: '', platform: 'instagram', count: 4 });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<SocialPost | null>(null);
  const { toast, toastNode } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    apiGet<{ posts: SocialPost[] }>('/social').then(d => setPosts(d.posts)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy(true);
    try {
      const r = await apiPost<{ posts: SocialPost[] }>('/social/generate', gen);
      toast(`Generated ${r.posts.length} posts`);
      setShowGen(false); setGen({ ...gen, prompt: '' }); load();
    } catch (e: any) { toast(e.message || 'Generation failed — is ANTHROPIC_API_KEY set?'); }
    finally { setBusy(false); }
  }
  async function remove(id: number) {
    if (!confirm('Delete this post?')) return;
    await apiDelete(`/social/${id}`); setOpen(null); load();
  }
  async function saveEdits(p: SocialPost) {
    await apiPatch(`/social/${p.id}`, p);
    setPosts(prev => prev.map(x => x.id === p.id ? p : x));
    setOpen(p); toast('Saved');
  }
  function dl(p: SocialPost) {
    const slug = (p.headline || 'betpal-post').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    downloadPost(specOf(p), `betpal-${p.platform}-${slug}.png`);
    toast('Downloading PNG…');
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Social Posts</h1>
          <div className="page-sub">Generate branded, ready-to-post graphics from a prompt — preview the mockup, tweak, and download the PNG.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowGen(true)}>✦ Generate posts</button>
      </div>

      {loading ? <div className="empty"><span className="spinner" /></div>
        : posts.length === 0 ? (
          <div className="card empty" style={{ padding: 40 }}>
            No posts yet. Hit <b style={{ color: 'var(--accent)' }}>✦ Generate posts</b> and describe a campaign —
            Claude writes the copy and lays it out on-brand. Real value only, never fabricated odds.
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', alignItems: 'start' }}>
            {posts.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div onClick={() => setOpen(p)} style={{ cursor: 'pointer' }}>
                  <PostCanvas spec={specOf(p)} maxWidth={520} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="chip accent">{platformLabel(p.platform)}</span>
                  <span className="chip">{FORMATS[p.format].label}</span>
                  <span className="chip">{p.template}</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => dl(p)}>↓ Download</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: '0 0 auto' }} onClick={() => setOpen(p)}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Generate modal */}
      {showGen && (
        <Modal title="✦ Generate social posts" onClose={() => setShowGen(false)}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Describe the campaign or angle. Claude writes platform-ready copy and lays each post out on-brand.
            Honest promotion only — no fabricated odds; every caption keeps the 18+/responsible-gambling note.
          </p>
          <div className="field"><label>Prompt</label>
            <textarea className="textarea" autoFocus value={gen.prompt} onChange={(e) => setGen({ ...gen, prompt: e.target.value })}
              placeholder="e.g. AFL finals push — hammer the 'compare 5 books in one screen' angle, energetic tone" /></div>
          <div className="row">
            <div className="field"><label>Platform</label>
              <select className="select" value={gen.platform} onChange={(e) => setGen({ ...gen, platform: e.target.value })}>
                {PLATFORMS.filter(p => p.key !== 'blog').map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select></div>
            <div className="field"><label>How many</label>
              <select className="select" value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })}>
                {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} posts</option>)}
              </select></div>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={busy}>{busy ? <span className="spinner" /> : 'Generate'}</button>
        </Modal>
      )}

      {/* Detail / edit modal */}
      {open && (
        <Modal title="Edit post" onClose={() => setOpen(null)}>
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}>
            <PostCanvas spec={specOf(open)} maxWidth={300} />
          </div>
          <div className="field"><label>Headline (on-image)</label>
            <input className="input" value={open.headline} onChange={(e) => setOpen({ ...open, headline: e.target.value })} /></div>
          <div className="field"><label>Subtext (on-image)</label>
            <input className="input" value={open.subtext} onChange={(e) => setOpen({ ...open, subtext: e.target.value })} /></div>
          <div className="row">
            <div className="field"><label>CTA</label>
              <input className="input" value={open.cta} onChange={(e) => setOpen({ ...open, cta: e.target.value })} /></div>
            <div className="field"><label>Format</label>
              <select className="select" value={open.format} onChange={(e) => setOpen({ ...open, format: e.target.value as any })}>
                {(Object.keys(FORMATS) as PostSpec['format'][]).map(f => <option key={f} value={f}>{FORMATS[f].label}</option>)}
              </select></div>
          </div>
          <div className="row">
            <div className="field"><label>Template</label>
              <select className="select" value={open.template} onChange={(e) => setOpen({ ...open, template: e.target.value as any })}>
                {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div className="field"><label>Colour</label>
              <select className="select" value={open.accent} onChange={(e) => setOpen({ ...open, accent: e.target.value as any })}>
                {ACCENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select></div>
          </div>
          {open.caption && (
            <div className="field"><label>Caption (to publish)</label>
              <textarea className="textarea" value={open.caption} onChange={(e) => setOpen({ ...open, caption: e.target.value })} /></div>
          )}
          {open.hashtags && <div className="chip" style={{ marginBottom: 12 }}>{open.hashtags}</div>}
          <div className="row">
            <button className="btn btn-primary" onClick={() => dl(open)}>↓ Download PNG</button>
            <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => saveEdits(open)}>Save</button>
            {open.caption && <button className="btn btn-ghost" style={{ flex: '0 0 auto' }} onClick={() => { navigator.clipboard?.writeText(`${open.caption}\n\n${open.hashtags}`); toast('Caption copied'); }}>Copy caption</button>}
            <button className="btn btn-danger" style={{ flex: '0 0 auto' }} onClick={() => remove(open.id)}>Delete</button>
          </div>
        </Modal>
      )}
      {toastNode}
    </>
  );
}
