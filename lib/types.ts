export type Role = 'owner' | 'admin' | 'contributor';

export interface User {
  id: number; email: string; name: string; role: Role; status: string; avatarColor: string;
}

export interface Todo {
  id: number; title: string; detail: string; category: string;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  assignee_id: number | null; position: number; source: 'manual' | 'ai';
  created_at: string; updated_at: string;
}

export interface MarketingItem {
  id: number; platform: string; title: string; body: string; hashtags: string;
  scheduled_for: string | null;
  status: 'idea' | 'draft' | 'scheduled' | 'posted' | 'skipped';
  assignee_id: number | null; source: string; created_at: string;
}

export interface ChangeEntry { id: number; type: string; title: string; detail: string; author_id: number | null; created_at: string; }
export interface ActivityEntry { id: number; actor_id: number | null; verb: string; object: string; summary: string; created_at: string; }
export interface Idea {
  id: number; title: string; body: string; status: string; author_id: number | null; created_at: string;
  votes: number; voted: number; comment_count: number;
  impl_tool?: 'claude_code' | 'claude_design' | 'claude_cowork' | null;
  impl_reason?: string | null; impl_prompt?: string | null; impl_title?: string | null; impl_generated_at?: string | null;
}
export interface IdeaComment { id: number; idea_id: number; author_id: number | null; body: string; created_at: string; author_name?: string; avatar_color?: string; }
export interface Metric { mkey: string; label: string; value: string; unit: string; trend: number | null; }
export interface AiDraft { id: number; kind: 'todo' | 'marketing'; payload: string; rationale: string; status: string; batch_id: string; created_at: string; }

export interface SocialPost {
  id: number; prompt: string; platform: string;
  format: 'square' | 'story' | 'landscape';
  template: 'odds' | 'stat' | 'announce' | 'quote';
  accent: 'green' | 'white' | 'dark';
  headline: string; subtext: string; cta: string; caption: string; hashtags: string;
  created_at: string;
}
