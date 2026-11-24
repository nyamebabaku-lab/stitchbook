import { create } from 'zustand';

export const useToasts = create(() => ({ list: [] }));
function push(kind, title, body) {
  const id = Math.random().toString(36).slice(2);
  useToasts.setState((s) => ({ list: [...s.list.slice(-2), { id, kind, title, body }] }));
  setTimeout(() => useToasts.setState((s) => ({ list: s.list.filter((t) => t.id !== id) })), kind === 'error' ? 6000 : 3500);
}
export const toast = {
  success: (t, b) => push('success', t, b),
  error: (t, b) => push('error', t, b),
  info: (t, b) => push('info', t, b),
};
