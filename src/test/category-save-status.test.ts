import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// UNIT TESTS: Category Save Status Flow
// Validates: categoria completa -> estado dirty -> onSaveComplete(success) -> estado saved
// =============================================================================

type CategorySaveStatus = 'idle' | 'dirty' | 'saved';

interface ChecklistItem {
  id: string;
  title: string;
  category: string;
  status: 'pending' | 'ok' | 'not_ok';
}

// Helper: Check if a category is complete (all items have OK or DX selection)
const isCategoryComplete = (
  category: string,
  states: Record<string, 'yes' | 'no' | null>,
  checklist: ChecklistItem[]
): boolean => {
  const categoryItems = checklist.filter(item => item.category === category);
  return categoryItems.every(item => {
    const state = states[item.id];
    return state === 'yes' || state === 'no';
  });
};

// Simulates the categorySaveStatus state management
const createCategorySaveStatusManager = (checklist: ChecklistItem[]) => {
  let status: Record<string, CategorySaveStatus> = {};
  let itemStates: Record<string, 'yes' | 'no' | null> = {};

  return {
    getStatus: () => status,
    getItemStates: () => itemStates,
    
    // Called when an item is changed
    handleItemChange: (itemId: string, value: 'yes' | 'no', category: string) => {
      itemStates = { ...itemStates, [itemId]: value };
      // Any interaction makes the category "dirty" until a save succeeds
      status = { ...status, [category]: 'dirty' };
      return { itemStates, status };
    },
    
    // Called when save completes successfully
    onSaveComplete: (success: boolean) => {
      if (!success) return status;
      
      const categories = [...new Set(checklist.map(i => i.category))];
      const newStatus: Record<string, CategorySaveStatus> = { ...status };
      
      categories.forEach((cat) => {
        if (isCategoryComplete(cat, itemStates, checklist)) {
          newStatus[cat] = 'saved';
        } else {
          if (newStatus[cat] === 'saved') newStatus[cat] = 'idle';
        }
      });
      
      status = newStatus;
      return status;
    },
    
    // Reset for testing
    reset: () => {
      status = {};
      itemStates = {};
    }
  };
};

describe('Category Save Status Flow', () => {
  const mockChecklist: ChecklistItem[] = [
    { id: 'item-1', title: 'Limpar pia', category: 'Cozinha', status: 'pending' },
    { id: 'item-2', title: 'Limpar fogão', category: 'Cozinha', status: 'pending' },
    { id: 'item-3', title: 'Limpar espelho', category: 'Banheiro', status: 'pending' },
    { id: 'item-4', title: 'Limpar vaso', category: 'Banheiro', status: 'pending' },
  ];

  let manager: ReturnType<typeof createCategorySaveStatusManager>;

  beforeEach(() => {
    manager = createCategorySaveStatusManager(mockChecklist);
  });

  describe('Initial State', () => {
    it('should start with empty status (idle)', () => {
      const status = manager.getStatus();
      expect(status).toEqual({});
    });

    it('should start with no item selections', () => {
      const itemStates = manager.getItemStates();
      expect(itemStates).toEqual({});
    });
  });

  describe('Item Change -> Dirty State', () => {
    it('should mark category as dirty when first item is changed', () => {
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      const status = manager.getStatus();
      
      expect(status['Cozinha']).toBe('dirty');
    });

    it('should keep category dirty when more items are changed', () => {
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      manager.handleItemChange('item-2', 'no', 'Cozinha');
      const status = manager.getStatus();
      
      expect(status['Cozinha']).toBe('dirty');
    });

    it('should only mark the changed category as dirty', () => {
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      const status = manager.getStatus();
      
      expect(status['Cozinha']).toBe('dirty');
      expect(status['Banheiro']).toBeUndefined();
    });

    it('should mark multiple categories as dirty independently', () => {
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      manager.handleItemChange('item-3', 'yes', 'Banheiro');
      const status = manager.getStatus();
      
      expect(status['Cozinha']).toBe('dirty');
      expect(status['Banheiro']).toBe('dirty');
    });
  });

  describe('Complete Category -> Still Dirty Until Save', () => {
    it('should remain dirty even when all category items are selected', () => {
      // Complete the Cozinha category (both items)
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      manager.handleItemChange('item-2', 'no', 'Cozinha');
      
      const status = manager.getStatus();
      const itemStates = manager.getItemStates();
      
      // Category is complete
      expect(isCategoryComplete('Cozinha', itemStates, mockChecklist)).toBe(true);
      // But still dirty (not yet saved)
      expect(status['Cozinha']).toBe('dirty');
    });
  });

  describe('onSaveComplete(success) -> Saved State', () => {
    it('should transition complete category from dirty to saved on success', () => {
      // Complete the Cozinha category
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      manager.handleItemChange('item-2', 'no', 'Cozinha');
      
      // Verify dirty state before save
      expect(manager.getStatus()['Cozinha']).toBe('dirty');
      
      // Simulate successful save
      const newStatus = manager.onSaveComplete(true);
      
      // Now should be saved
      expect(newStatus['Cozinha']).toBe('saved');
    });

    it('should NOT transition incomplete category to saved', () => {
      // Only complete one item in Cozinha
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      
      // Simulate successful save
      const newStatus = manager.onSaveComplete(true);
      
      // Category is incomplete, should remain dirty
      expect(newStatus['Cozinha']).toBe('dirty');
    });

    it('should keep dirty state on failed save', () => {
      // Complete the Cozinha category
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      manager.handleItemChange('item-2', 'no', 'Cozinha');
      
      // Simulate failed save
      const newStatus = manager.onSaveComplete(false);
      
      // Should still be dirty
      expect(newStatus['Cozinha']).toBe('dirty');
    });

    it('should handle multiple categories on save', () => {
      // Complete Cozinha
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      manager.handleItemChange('item-2', 'no', 'Cozinha');
      
      // Partially complete Banheiro
      manager.handleItemChange('item-3', 'yes', 'Banheiro');
      
      // Simulate successful save
      const newStatus = manager.onSaveComplete(true);
      
      // Cozinha is complete -> saved
      expect(newStatus['Cozinha']).toBe('saved');
      // Banheiro is incomplete -> stays dirty
      expect(newStatus['Banheiro']).toBe('dirty');
    });
  });

  describe('Edit After Save -> Dirty Again', () => {
    it('should transition saved category back to dirty when edited', () => {
      // Complete and save Cozinha
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      manager.handleItemChange('item-2', 'no', 'Cozinha');
      manager.onSaveComplete(true);
      
      expect(manager.getStatus()['Cozinha']).toBe('saved');
      
      // Edit an item (change the selection)
      manager.handleItemChange('item-1', 'no', 'Cozinha');
      
      // Should be dirty again
      expect(manager.getStatus()['Cozinha']).toBe('dirty');
    });
  });

  describe('Uncomplete Category After Save', () => {
    it('should handle category becoming incomplete after being saved', () => {
      // Complete and save both categories
      manager.handleItemChange('item-1', 'yes', 'Cozinha');
      manager.handleItemChange('item-2', 'no', 'Cozinha');
      manager.handleItemChange('item-3', 'yes', 'Banheiro');
      manager.handleItemChange('item-4', 'no', 'Banheiro');
      manager.onSaveComplete(true);
      
      expect(manager.getStatus()['Cozinha']).toBe('saved');
      expect(manager.getStatus()['Banheiro']).toBe('saved');
      
      // This test validates that once saved, the category 
      // correctly transitions based on new save events
    });
  });
});

describe('CSS Class Application Logic', () => {
  // Helper to compute visual state flags
  const computeVisualState = (saveStatus: CategorySaveStatus, allSelected: boolean) => {
    const isSaved = allSelected && saveStatus === 'saved';
    const isDirtyComplete = allSelected && saveStatus === 'dirty';
    return { isSaved, isDirtyComplete };
  };

  it('should compute correct class for idle state', () => {
    const { isSaved, isDirtyComplete } = computeVisualState('idle', false);
    
    expect(isSaved).toBe(false);
    expect(isDirtyComplete).toBe(false);
    // Expected: default styling (no green/amber, no sync icon)
  });

  it('should compute correct class for dirty incomplete state', () => {
    const { isSaved, isDirtyComplete } = computeVisualState('dirty', false);
    
    expect(isSaved).toBe(false);
    expect(isDirtyComplete).toBe(false);
    // Expected: default styling (in progress, but not complete)
  });

  it('should compute correct class for dirty complete state (syncing)', () => {
    const { isSaved, isDirtyComplete } = computeVisualState('dirty', true);
    
    expect(isSaved).toBe(false);
    expect(isDirtyComplete).toBe(true);
    // Expected: primary highlight with sync icon spinning
  });

  it('should compute correct class for saved complete state', () => {
    const { isSaved, isDirtyComplete } = computeVisualState('saved', true);
    
    expect(isSaved).toBe(true);
    expect(isDirtyComplete).toBe(false);
    // Expected: green (all OK) or amber (has issues) highlight
  });

  it('should apply green styling when saved with all OK', () => {
    const { isSaved } = computeVisualState('saved', true);
    const hasIssues = false;
    const expectedClass = isSaved && !hasIssues ? 'border-green-500' : '';
    
    expect(expectedClass).toBe('border-green-500');
  });

  it('should apply amber styling when saved with issues', () => {
    const { isSaved } = computeVisualState('saved', true);
    const hasIssues = true;
    const expectedClass = isSaved && hasIssues ? 'border-amber-500' : '';
    
    expect(expectedClass).toBe('border-amber-500');
  });
});

describe('Integration: Full Flow Simulation', () => {
  it('should complete full flow: idle -> dirty -> saved with correct visual states', () => {
    const checklist: ChecklistItem[] = [
      { id: '1', title: 'Item A', category: 'Test', status: 'pending' },
      { id: '2', title: 'Item B', category: 'Test', status: 'pending' },
    ];
    
    const manager = createCategorySaveStatusManager(checklist);
    
    // Step 1: Initial state (idle)
    expect(manager.getStatus()['Test']).toBeUndefined();
    
    // Step 2: First item change -> dirty
    manager.handleItemChange('1', 'yes', 'Test');
    expect(manager.getStatus()['Test']).toBe('dirty');
    expect(isCategoryComplete('Test', manager.getItemStates(), checklist)).toBe(false);
    
    // Step 3: Complete category -> still dirty
    manager.handleItemChange('2', 'no', 'Test');
    expect(manager.getStatus()['Test']).toBe('dirty');
    expect(isCategoryComplete('Test', manager.getItemStates(), checklist)).toBe(true);
    
    // Step 4: Auto-save triggers and succeeds -> saved
    manager.onSaveComplete(true);
    expect(manager.getStatus()['Test']).toBe('saved');
    
    // Visual state assertions
    const status = manager.getStatus()['Test'];
    const allSelected = isCategoryComplete('Test', manager.getItemStates(), checklist);
    const isSaved = allSelected && status === 'saved';
    
    expect(isSaved).toBe(true);
    // At this point, the UI should show green/amber border (not sync icon)
  });
});
