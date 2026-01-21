import { describe, it, expect, vi } from 'vitest';
import { ChecklistItem, Schedule, ScheduleStatus, STATUS_FLOW, STATUS_ALLOWED_ROLES } from '@/types/scheduling';

// =============================================================================
// UNIT TESTS: Validação de Regras de Negócio
// =============================================================================

describe('Regras de Fluxo de Status', () => {
  describe('STATUS_FLOW', () => {
    it('should define correct status transitions', () => {
      expect(STATUS_FLOW.waiting).toBe('released');
      expect(STATUS_FLOW.released).toBe('cleaning');
      expect(STATUS_FLOW.cleaning).toBe('completed');
      expect(STATUS_FLOW.completed).toBeNull();
    });

    it('should not allow skipping statuses', () => {
      // Cannot go from waiting directly to cleaning
      expect(STATUS_FLOW.waiting).not.toBe('cleaning');
      // Cannot go from released directly to completed
      expect(STATUS_FLOW.released).not.toBe('completed');
    });
  });

  describe('STATUS_ALLOWED_ROLES', () => {
    it('should allow only admin/manager to release', () => {
      expect(STATUS_ALLOWED_ROLES.released).toContain('admin');
      expect(STATUS_ALLOWED_ROLES.released).toContain('manager');
      expect(STATUS_ALLOWED_ROLES.released).not.toContain('cleaner');
    });

    it('should allow all roles to start cleaning', () => {
      expect(STATUS_ALLOWED_ROLES.cleaning).toContain('admin');
      expect(STATUS_ALLOWED_ROLES.cleaning).toContain('manager');
      expect(STATUS_ALLOWED_ROLES.cleaning).toContain('cleaner');
    });

    it('should allow all roles to complete', () => {
      expect(STATUS_ALLOWED_ROLES.completed).toContain('admin');
      expect(STATUS_ALLOWED_ROLES.completed).toContain('manager');
      expect(STATUS_ALLOWED_ROLES.completed).toContain('cleaner');
    });

    it('should not allow anyone to transition TO waiting', () => {
      expect(STATUS_ALLOWED_ROLES.waiting).toHaveLength(0);
    });
  });
});

describe('Validação de Checklist', () => {
  const createMockChecklist = (items: Partial<ChecklistItem>[]): ChecklistItem[] => {
    return items.map((item, index) => ({
      id: `item-${index}`,
      title: `Item ${index}`,
      category: 'Geral',
      completed: false,
      status: 'pending' as const,
      ...item,
    }));
  };

  describe('Validação de Itens Pendentes', () => {
    it('should detect pending items when status is pending', () => {
      const checklist = createMockChecklist([
        { status: 'ok' },
        { status: 'pending' },
        { status: 'not_ok' },
      ]);

      const pendingItems = checklist.filter(item => item.status === 'pending');
      expect(pendingItems).toHaveLength(1);
    });

    it('should allow completion when all items have status (ok or not_ok)', () => {
      const checklist = createMockChecklist([
        { status: 'ok' },
        { status: 'not_ok' },
        { status: 'ok' },
      ]);

      const pendingItems = checklist.filter(item => item.status === 'pending');
      expect(pendingItems).toHaveLength(0);
    });

    it('should block completion when any item is pending', () => {
      const checklist = createMockChecklist([
        { status: 'ok' },
        { status: 'pending' },
      ]);

      const canComplete = checklist.every(item => 
        item.status === 'ok' || item.status === 'not_ok'
      );
      expect(canComplete).toBe(false);
    });
  });

  describe('Contagem por Categoria', () => {
    it('should group items by category', () => {
      const checklist = createMockChecklist([
        { category: 'Cozinha', status: 'ok' },
        { category: 'Cozinha', status: 'pending' },
        { category: 'Banheiro', status: 'ok' },
        { category: 'Banheiro', status: 'ok' },
      ]);

      const grouped = checklist.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, ChecklistItem[]>);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['Cozinha']).toHaveLength(2);
      expect(grouped['Banheiro']).toHaveLength(2);
    });

    it('should calculate pending count per category', () => {
      const checklist = createMockChecklist([
        { category: 'Cozinha', status: 'ok' },
        { category: 'Cozinha', status: 'pending' },
        { category: 'Cozinha', status: 'pending' },
        { category: 'Banheiro', status: 'ok' },
      ]);

      const getPendingByCategory = (items: ChecklistItem[], category: string) => {
        return items.filter(i => 
          i.category === category && i.status === 'pending'
        ).length;
      };

      expect(getPendingByCategory(checklist, 'Cozinha')).toBe(2);
      expect(getPendingByCategory(checklist, 'Banheiro')).toBe(0);
    });
  });
});

describe('Validação de Fotos por Categoria', () => {
  it('should detect missing photos when category is complete but has no photo', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', title: 'Item 1', category: 'Cozinha', completed: true, status: 'ok' },
      { id: '2', title: 'Item 2', category: 'Cozinha', completed: true, status: 'ok' },
    ];
    const categoryPhotos: Record<string, { url: string }[]> = {};

    const getCategoriesMissingPhotos = (
      items: ChecklistItem[], 
      photos: Record<string, { url: string }[]>,
      requirePhotoPerCategory: boolean
    ): string[] => {
      if (!requirePhotoPerCategory) return [];
      
      const categories = [...new Set(items.map(i => i.category))];
      const missing: string[] = [];
      
      categories.forEach(category => {
        const categoryItems = items.filter(i => i.category === category);
        const allComplete = categoryItems.every(i => 
          i.status === 'ok' || i.status === 'not_ok'
        );
        const hasPhoto = photos[category] && photos[category].length > 0;
        
        if (allComplete && !hasPhoto) {
          missing.push(category);
        }
      });
      
      return missing;
    };

    const missing = getCategoriesMissingPhotos(checklist, categoryPhotos, true);
    expect(missing).toContain('Cozinha');
  });

  it('should not require photos when setting is disabled', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', title: 'Item 1', category: 'Cozinha', completed: true, status: 'ok' },
    ];
    const categoryPhotos: Record<string, { url: string }[]> = {};

    const getCategoriesMissingPhotos = (
      items: ChecklistItem[], 
      photos: Record<string, { url: string }[]>,
      requirePhotoPerCategory: boolean
    ): string[] => {
      if (!requirePhotoPerCategory) return [];
      const categories = [...new Set(items.map(i => i.category))];
      const missing: string[] = [];
      categories.forEach(category => {
        const categoryItems = items.filter(i => i.category === category);
        const allComplete = categoryItems.every(i => 
          i.status === 'ok' || i.status === 'not_ok'
        );
        const hasPhoto = photos[category] && photos[category].length > 0;
        if (allComplete && !hasPhoto) missing.push(category);
      });
      return missing;
    };

    const missing = getCategoriesMissingPhotos(checklist, categoryPhotos, false);
    expect(missing).toHaveLength(0);
  });
});

describe('Validação de Avaria (Issue Report)', () => {
  describe('Validação de Step 2 - Seleção de Item', () => {
    it('should require item selection from list OR custom text', () => {
      // Scenario 1: Item from list selected
      const selectedItem = 'Torneira';
      const isOtherItem = false;
      const otherItemText = '';
      
      const isValid1 = (!isOtherItem && selectedItem) || (isOtherItem && otherItemText.trim());
      expect(isValid1).toBeTruthy();

      // Scenario 2: "Other" selected with text
      const isValid2 = (true && 'Outro item customizado'.trim());
      expect(isValid2).toBeTruthy();

      // Scenario 3: "Other" selected but no text (INVALID)
      const isValid3 = (true && ''.trim());
      expect(isValid3).toBeFalsy();

      // Scenario 4: Neither selected (INVALID)
      const isValid4 = (false && '') || (false && '');
      expect(isValid4).toBeFalsy();
    });

    it('should compute final item value correctly', () => {
      // When using list item
      const getFinalValue1 = (isOther: boolean, otherText: string, selected: string) => {
        return isOther ? otherText.trim() : selected;
      };

      expect(getFinalValue1(false, '', 'Torneira')).toBe('Torneira');
      expect(getFinalValue1(true, 'Custom Item', '')).toBe('Custom Item');
      expect(getFinalValue1(true, '  Trimmed Item  ', '')).toBe('Trimmed Item');
    });
  });
});

describe('Validação de Transição de Status', () => {
  const canTransitionStatus = (
    fromStatus: ScheduleStatus,
    toStatus: ScheduleStatus,
    userRole: 'admin' | 'manager' | 'cleaner'
  ): { allowed: boolean; reason?: string } => {
    // Check if transition is valid according to flow
    const expectedNext = STATUS_FLOW[fromStatus];
    if (expectedNext !== toStatus) {
      return { allowed: false, reason: 'Transição inválida' };
    }

    // Check role permission
    const allowedRoles = STATUS_ALLOWED_ROLES[toStatus];
    if (!allowedRoles.includes(userRole)) {
      return { allowed: false, reason: 'Sem permissão' };
    }

    return { allowed: true };
  };

  it('should allow admin to release', () => {
    const result = canTransitionStatus('waiting', 'released', 'admin');
    expect(result.allowed).toBe(true);
  });

  it('should allow manager to release', () => {
    const result = canTransitionStatus('waiting', 'released', 'manager');
    expect(result.allowed).toBe(true);
  });

  it('should NOT allow cleaner to release', () => {
    const result = canTransitionStatus('waiting', 'released', 'cleaner');
    expect(result.allowed).toBe(false);
  });

  it('should allow cleaner to start cleaning', () => {
    const result = canTransitionStatus('released', 'cleaning', 'cleaner');
    expect(result.allowed).toBe(true);
  });

  it('should allow cleaner to complete', () => {
    const result = canTransitionStatus('cleaning', 'completed', 'cleaner');
    expect(result.allowed).toBe(true);
  });

  it('should NOT allow skipping from waiting to cleaning', () => {
    const result = canTransitionStatus('waiting', 'cleaning', 'admin');
    expect(result.allowed).toBe(false);
  });
});

describe('Validação de Acknowledgment', () => {
  const hashNotes = (notes: string): string => {
    let hash = 0;
    for (let i = 0; i < notes.length; i++) {
      const char = notes.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  };

  it('should create consistent hash for same notes', () => {
    const notes = 'Importante: checar vazamento na cozinha';
    const hash1 = hashNotes(notes);
    const hash2 = hashNotes(notes);
    expect(hash1).toBe(hash2);
  });

  it('should create different hash for different notes', () => {
    const hash1 = hashNotes('Note 1');
    const hash2 = hashNotes('Note 2');
    expect(hash1).not.toBe(hash2);
  });

  it('should detect if user has acknowledged', () => {
    const history = [
      { 
        action: 'notes_acknowledged', 
        team_member_id: 'user-123',
        timestamp: new Date().toISOString(),
      },
    ];
    const teamMemberId = 'user-123';

    const hasAcknowledged = history.some(event => 
      event.action === 'notes_acknowledged' && 
      event.team_member_id === teamMemberId
    );

    expect(hasAcknowledged).toBe(true);
  });

  it('should not detect acknowledgment from different user', () => {
    const history = [
      { 
        action: 'notes_acknowledged', 
        team_member_id: 'user-123',
        timestamp: new Date().toISOString(),
      },
    ];
    const teamMemberId = 'user-456';

    const hasAcknowledged = history.some(event => 
      event.action === 'notes_acknowledged' && 
      event.team_member_id === teamMemberId
    );

    expect(hasAcknowledged).toBe(false);
  });
});
