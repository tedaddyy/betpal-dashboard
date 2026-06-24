'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Modal, useToast } from '@/lib/ui';
import type { Todo, User } from '@/lib/types';

const COLUMNS: { key: Todo['status']; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];
const CATEGORIES = ['product', 'growth', 'bug', 'infra', 'content', 'other'];
const PRIORITIES: Todo['priority'][] = ['p0', 'p1', 'p2', 'p3'];
const blank = { title: '', detail: '', category: 'product', priority: 'p2' as Todo['priority'], status: 'backlog' as Todo['status'], assignee_id: null as number | null };

export default function BacklogPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [editing, setEditing] = useState<Partial<Todo> | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);
  const { toast, toastNode } = useToast();

  const load = useCallback(() => {
    apiGet<{ todos: Todo[] }>('/todos').then((d) => setTodos(d.todos)).catch(() => {});
  }, []);
  useEffect(() => { load(); apiGet<{ members: User[] }>('/team').then((d) => setMembers(d.members.filter(m => m.status === 'active'))).catch(() => {}); }, [load]);

  const memberName = (id: number | null) => members.find(m => m.id === id)?.name || members.find(m => m.id === id)?.email?.split('@')[0] || null;

  async function save() {
    if (!editing?.title?.trim()) return;
    try {
      if (editing.id) await apiPatch(`/todos/${editing.id}`, editing);
      else await apiPost('/todos', editing);
      setEditing(null); load(); toast(editing.id ? 'Saved' : 'Added to backlog');
    } catch (e: any) { toast(e.message); }
  }
  async function remove(id: number) {
    if (!confirm('Delete this item?')) return;
    await apiDelete(`/todos/${id}`); setEditing(null); load();
  }

  async function drop(status: Todo['status']) {
    if (dragId == null) return;
    const t = todos.find(x => x.id === dragId);
    setDragCol(null);
    if (!t || t.status === status) { setDragId(null); return; }
    setTodos(prev => prev.map(x => x.id === dragId ? { ...x, status } : x)); // optimistic
    try { await apiPatch(`/todos/${dragId}`, { status, position: Date.now() }); load(); }
    catch { load(); }
    setDragId(null);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Backlog</h1>
          <div className="page-sub">The living to-do list — what to build or fix next. Drag cards to move them.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ ...blank })}>+ Add item</button>
      </div>

      <div className="board">
        {COLUMNS.map((col) => {
          const items = todos.filter(t => t.status === col.key).sort((a, b) => a.position - b.position);
          return (
            <div key={col.key}
              className={`col${dragCol === col.key ? ' drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragCol(col.key); }}
              onDragLeave={() => setDragCol(c => c === col.key ? null : c)}
              onDrop={() => drop(col.key)}>
              <div className="col-head"><span>{col.label}</span><span className="col-count">{items.length}</span></div>
              {items.map((t) => (
                <div key={t.id} className="task" draggable
                  onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setDragCol(null); }}
                  onClick={() => setEditing(t)}>
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    <span className={`chip pill-${t.priority}`}>{t.priority.toUpperCase()}</span>
                    <span className="chip">{t.category}</span>
                    {t.source === 'ai' && <span className="task-ai">✦ AI</span>}
                    {memberName(t.assignee_id) && <span className="chip">@{memberName(t.assignee_id)}</span>}
                  </div>
                </div>
              ))}
              {items.length === 0 && <div className="empty" style={{ padding: 12, fontSize: 12 }}>—</div>}
            </div>
          );
        })}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit item' : 'New backlog item'} onClose={() => setEditing(null)}>
          <div className="field"><label>Title</label>
            <input className="input" value={editing.title || ''} autoFocus
              onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="What needs doing?" /></div>
          <div className="field"><label>Detail</label>
            <textarea className="textarea" value={editing.detail || ''}
              onChange={(e) => setEditing({ ...editing, detail: e.target.value })} placeholder="Context / why it matters" /></div>
          <div className="row">
            <div className="field"><label>Priority</label>
              <select className="select" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value as any })}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select></div>
            <div className="field"><label>Category</label>
              <select className="select" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
          </div>
          <div className="row">
            <div className="field"><label>Status</label>
              <select className="select" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select></div>
            <div className="field"><label>Assignee</label>
              <select className="select" value={editing.assignee_id ?? ''} onChange={(e) => setEditing({ ...editing, assignee_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
              </select></div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={save}>{editing.id ? 'Save' : 'Add'}</button>
            {editing.id && <button className="btn btn-danger" style={{ flex: '0 0 auto' }} onClick={() => remove(editing.id!)}>Delete</button>}
            <button className="btn btn-ghost" style={{ flex: '0 0 auto' }} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </Modal>
      )}
      {toastNode}
    </>
  );
}
