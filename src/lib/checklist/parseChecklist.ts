import type { ChecklistItem } from '@/types/scheduling';
import type { Json } from '@/integrations/supabase/types';

type ChecklistItemStatus = 'pending' | 'ok' | 'not_ok';

const isStatus = (v: unknown): v is ChecklistItemStatus =>
  v === 'pending' || v === 'ok' || v === 'not_ok';

/**
 * Parses checklist JSON coming from the backend.
 *
 * Backward-compat:
 * - Older checklist payloads may not include `status` and only have `completed`.
 *   In that case, we treat `completed: true` as `status: 'ok'`.
 */
export const parseChecklist = (checklists: Json | null): ChecklistItem[] => {
  if (!checklists || !Array.isArray(checklists)) return [];

  return checklists.map((item: unknown, index: number) => {
    const typedItem = item as Record<string, unknown>;

    const completed = Boolean(typedItem?.completed);
    const status: ChecklistItemStatus = isStatus(typedItem?.status)
      ? typedItem.status
      : completed
        ? 'ok'
        : 'pending';

    return {
      id: String(typedItem?.id || index),
      title: String(typedItem?.title || ''),
      // Keep existing meaning: `completed` is specifically OK/green.
      completed: status === 'ok' ? true : completed,
      category: String(typedItem?.category || 'Geral'),
      status,
    };
  });
};
