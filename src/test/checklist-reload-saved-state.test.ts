import { describe, expect, it } from 'vitest';
import { parseChecklist } from '@/lib/checklist/parseChecklist';

type ChecklistItemStatus = 'pending' | 'ok' | 'not_ok';

function computeIsSavedFromReload(items: { status?: ChecklistItemStatus }[]) {
  const total = items.length;
  const selectedCount = items.filter((it) => it.status === 'ok' || it.status === 'not_ok').length;
  const allSelected = total > 0 && selectedCount === total;
  const isPersistedComplete = allSelected && items.every((it) => it.status === 'ok' || it.status === 'not_ok');
  const saveStatus = isPersistedComplete ? 'saved' : allSelected ? 'dirty' : 'idle';
  return allSelected && saveStatus === 'saved';
}

describe('reload: checklist vindo do backend deve renderizar categoria como saved', () => {
  it('considera saved quando todos os itens já vem com status ok/not_ok', () => {
    const items = [
      { status: 'ok' as const },
      { status: 'not_ok' as const },
      { status: 'ok' as const },
    ];
    expect(computeIsSavedFromReload(items)).toBe(true);
  });

  it('back-compat: completed:true sem status deve virar status ok no parse', () => {
    const parsed = parseChecklist([
      { id: '1', title: 'Outro 1', category: 'Outro', completed: true },
      { id: '2', title: 'Outro 2', category: 'Outro', completed: true },
    ] as any);

    expect(parsed.map((i) => i.status)).toEqual(['ok', 'ok']);
    expect(computeIsSavedFromReload(parsed)).toBe(true);
  });
});
