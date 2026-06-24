'use client';
import React, { useEffect, useState } from 'react';

export function initials(name?: string, email?: string) {
  const s = (name || email || '?').trim();
  const parts = s.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || s[0]?.toUpperCase() || '?';
}

export function timeAgo(iso: string) {
  const d = new Date(iso.includes('Z') || iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24); if (dd < 30) return `${dd}d ago`;
  return d.toLocaleDateString();
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{msg}</div>;
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const node = msg ? <Toast msg={msg} onDone={() => setMsg(null)} /> : null;
  return { toast: setMsg, toastNode: node };
}

export const PLATFORMS = [
  { key: 'x', label: 'X', ico: '𝕏' },
  { key: 'instagram', label: 'Instagram', ico: '📸' },
  { key: 'tiktok', label: 'TikTok', ico: '🎵' },
  { key: 'reddit', label: 'Reddit', ico: '👽' },
  { key: 'youtube', label: 'YouTube', ico: '▶' },
  { key: 'blog', label: 'Blog', ico: '✍' },
];
export const platformLabel = (k: string) => PLATFORMS.find(p => p.key === k)?.label || k;
export const platformIco = (k: string) => PLATFORMS.find(p => p.key === k)?.ico || '•';
