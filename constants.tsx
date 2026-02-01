
import { CategoryInfo } from './types';

export const KNOWLEDGE_CATEGORIES: CategoryInfo[] = [
  { id: 'ai-code', label: 'AI & Code', icon: '🤖', prompt: 'What problem does this solve?' },
  { id: 'design', label: 'Design Tools', icon: '🎨', prompt: 'How will this improve your workflow?' },
  { id: 'media', label: 'Media Tools', icon: '🎬', prompt: 'What content will you create?' },
  { id: 'business', label: 'Business Ideas', icon: '💰', prompt: 'Who would pay for this?' },
  { id: 'automation', label: 'AI Automations', icon: '⚡', prompt: 'What manual task does this eliminate?' },
  { id: 'teaching', label: 'Teaching Notes', icon: '🎓', prompt: 'How would you explain this to someone else?' },
  { id: 'productivity', label: 'Productivity', icon: '🔧', prompt: 'How will this make you more efficient?' },
  { id: 'people', label: 'Creators & Experts', icon: '👤', prompt: 'Why is this person worth following?' },
];

export const JOB_STATUSES = ['Apply', 'Applied', 'Interview', 'Rejected', 'Offer'] as const;

export const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-50 text-red-700 border-red-100',
  Medium: 'bg-amber-50 text-amber-700 border-amber-100',
  Low: 'bg-slate-50 text-slate-600 border-slate-100',
};
