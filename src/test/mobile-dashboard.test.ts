import { describe, it, expect } from 'vitest';
import { 
  startOfDay, 
  isSameDay, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval,
  format,
} from 'date-fns';
import { Schedule, ScheduleStatus } from '@/types/scheduling';

// =============================================================================
// UNIT TESTS: Mobile Dashboard Logic
// =============================================================================

const createMockSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: `schedule-${Math.random().toString(36).substr(2, 9)}`,
  propertyId: 'property-1',
  propertyName: 'Casa de Teste',
  propertyAddress: 'Rua Teste, 123',
  guestName: 'Hóspede Teste',
  numberOfGuests: 2,
  checkIn: new Date(),
  checkOut: new Date(),
  status: 'waiting' as ScheduleStatus,
  maintenanceStatus: 'ok',
  priority: 'medium',
  cleanerName: 'Limpador Teste',
  estimatedDuration: 60,
  checklist: [],
  photos: [],
  maintenanceIssues: [],
  notes: '',
  missingMaterials: [],
  ackByTeamMembers: [],
  history: [],
  isActive: true,
  ...overrides,
});

describe('C01 - Home: Resumo de atividades', () => {
  it('should calculate period stats correctly for today', () => {
    const now = new Date();
    const today = startOfDay(now);
    
    const schedules = [
      createMockSchedule({ checkOut: today, status: 'waiting' }),
      createMockSchedule({ checkOut: today, status: 'cleaning' }),
      createMockSchedule({ checkOut: today, status: 'completed' }),
      createMockSchedule({ checkOut: addDays(today, 1), status: 'waiting' }),
    ];

    const todaySchedules = schedules.filter(s => isSameDay(s.checkOut, today));
    const pending = todaySchedules.filter(s => s.status !== 'completed');
    const completed = todaySchedules.filter(s => s.status === 'completed');

    expect(todaySchedules).toHaveLength(3);
    expect(pending).toHaveLength(2);
    expect(completed).toHaveLength(1);
  });
});

describe('C02 - Tarefas atrasadas', () => {
  it('should identify overdue schedules', () => {
    const today = startOfDay(new Date());
    const yesterday = addDays(today, -1);
    const twoDaysAgo = addDays(today, -2);

    const schedules = [
      createMockSchedule({ checkOut: yesterday, status: 'waiting' }), // Overdue
      createMockSchedule({ checkOut: twoDaysAgo, status: 'released' }), // Overdue
      createMockSchedule({ checkOut: today, status: 'waiting' }), // Not overdue
      createMockSchedule({ checkOut: yesterday, status: 'completed' }), // Not overdue (completed)
    ];

    const overdueSchedules = schedules.filter(s => 
      (s.status === 'waiting' || s.status === 'released') &&
      startOfDay(s.checkOut) < today
    );

    expect(overdueSchedules).toHaveLength(2);
  });

  it('should count overdue correctly', () => {
    const today = startOfDay(new Date());
    const yesterday = addDays(today, -1);

    const schedules = [
      createMockSchedule({ checkOut: yesterday, status: 'waiting' }),
      createMockSchedule({ checkOut: yesterday, status: 'released' }),
      createMockSchedule({ checkOut: yesterday, status: 'cleaning' }), // In progress, not overdue
    ];

    const overdueCount = schedules.filter(s => 
      (s.status === 'waiting' || s.status === 'released') &&
      startOfDay(s.checkOut) < today
    ).length;

    expect(overdueCount).toBe(2);
  });
});

describe('C06 - Agenda: Indicadores de dia', () => {
  it('should calculate day indicators correctly', () => {
    const today = startOfDay(new Date());
    const todayKey = format(today, 'yyyy-MM-dd');

    const schedules = [
      createMockSchedule({ checkOut: today, status: 'waiting' }),
      createMockSchedule({ checkOut: today, status: 'released' }),
      createMockSchedule({ checkOut: today, status: 'cleaning' }),
      createMockSchedule({ checkOut: today, status: 'completed' }),
    ];

    const indicators: Record<string, { pending: number; completed: number; gold: number }> = {};

    schedules.forEach(s => {
      const dateKey = format(s.checkOut, 'yyyy-MM-dd');
      if (!indicators[dateKey]) {
        indicators[dateKey] = { pending: 0, completed: 0, gold: 0 };
      }
      if (s.status === 'completed') {
        indicators[dateKey].completed++;
      } else if (s.status === 'waiting' || s.status === 'released') {
        indicators[dateKey].pending++;
      } else {
        indicators[dateKey].gold++;
      }
    });

    expect(indicators[todayKey].pending).toBe(2);
    expect(indicators[todayKey].gold).toBe(1);
    expect(indicators[todayKey].completed).toBe(1);
  });
});

describe('C07/C08 - Visibilidade de Senha', () => {
  const isPasswordVisible = (
    schedule: Schedule,
    role: 'admin' | 'manager' | 'cleaner',
    isCheckoutDay: boolean
  ): boolean => {
    // Admin/Manager always see password
    if (role === 'admin' || role === 'manager') return true;

    // Completed = no password
    if (schedule.status === 'completed') return false;

    // Check if overdue (past date + not completed)
    const today = startOfDay(new Date());
    const isOverdue = startOfDay(schedule.checkOut) < today;
    
    // Overdue tasks that are not completed show password
    if (isOverdue && ['waiting', 'released', 'cleaning'].includes(schedule.status)) {
      return true;
    }

    // Checkout day + released/cleaning
    if (isCheckoutDay && ['released', 'cleaning'].includes(schedule.status)) {
      return true;
    }

    return false;
  };

  it('should always show password to admin', () => {
    const schedule = createMockSchedule({ status: 'waiting' });
    expect(isPasswordVisible(schedule, 'admin', false)).toBe(true);
  });

  it('should always show password to manager', () => {
    const schedule = createMockSchedule({ status: 'waiting' });
    expect(isPasswordVisible(schedule, 'manager', false)).toBe(true);
  });

  it('should hide password from cleaner when completed', () => {
    const schedule = createMockSchedule({ status: 'completed' });
    expect(isPasswordVisible(schedule, 'cleaner', true)).toBe(false);
  });

  it('should show password to cleaner on checkout day when released', () => {
    const schedule = createMockSchedule({ status: 'released' });
    expect(isPasswordVisible(schedule, 'cleaner', true)).toBe(true);
  });

  it('should show password to cleaner for overdue tasks', () => {
    const yesterday = addDays(new Date(), -1);
    const schedule = createMockSchedule({ 
      status: 'waiting', 
      checkOut: yesterday 
    });
    expect(isPasswordVisible(schedule, 'cleaner', false)).toBe(true);
  });
});

describe('C18/C19 - Validação de Finalização', () => {
  it('should detect pending checklist items', () => {
    const checklist = [
      { id: '1', title: 'Item 1', category: 'Geral', completed: false, status: 'ok' as 'pending' | 'ok' | 'not_ok' },
      { id: '2', title: 'Item 2', category: 'Geral', completed: false, status: 'pending' as 'pending' | 'ok' | 'not_ok' },
      { id: '3', title: 'Item 3', category: 'Geral', completed: false, status: 'not_ok' as 'pending' | 'ok' | 'not_ok' },
    ];

    const hasPendingItems = checklist.some(item => item.status === 'pending');
    expect(hasPendingItems).toBe(true);
  });

  it('should allow completion when all items are marked', () => {
    const checklist = [
      { id: '1', title: 'Item 1', category: 'Geral', completed: true, status: 'ok' as 'pending' | 'ok' | 'not_ok' },
      { id: '2', title: 'Item 2', category: 'Geral', completed: false, status: 'not_ok' as 'pending' | 'ok' | 'not_ok' },
    ];

    const hasPendingItems = checklist.some(item => item.status === 'pending');
    expect(hasPendingItems).toBe(false);
  });

  it('should calculate total pending items correctly', () => {
    const checklist = [
      { id: '1', title: 'Item 1', category: 'Cozinha', completed: false, status: 'pending' as 'pending' | 'ok' | 'not_ok' },
      { id: '2', title: 'Item 2', category: 'Cozinha', completed: false, status: 'pending' as 'pending' | 'ok' | 'not_ok' },
      { id: '3', title: 'Item 3', category: 'Banheiro', completed: true, status: 'ok' as 'pending' | 'ok' | 'not_ok' },
      { id: '4', title: 'Item 4', category: 'Banheiro', completed: false, status: 'pending' as 'pending' | 'ok' | 'not_ok' },
    ];

    const totalPending = checklist.filter(item => item.status === 'pending').length;
    expect(totalPending).toBe(3);
  });
});

describe('Cálculo de Estatísticas Mensais', () => {
  it('should count completed tasks in current month', () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const schedules = [
      createMockSchedule({ checkOut: now, status: 'completed' }),
      createMockSchedule({ checkOut: now, status: 'completed' }),
      createMockSchedule({ checkOut: addDays(now, -40), status: 'completed' }), // Previous month
      createMockSchedule({ checkOut: now, status: 'waiting' }),
    ];

    const monthCompletedCount = schedules.filter(s => 
      s.status === 'completed' &&
      isWithinInterval(s.checkOut, { start: monthStart, end: monthEnd })
    ).length;

    expect(monthCompletedCount).toBe(2);
  });
});

describe('Filtro de Período', () => {
  it('should filter schedules by week', () => {
    const now = new Date();
    const today = startOfDay(now);
    
    const schedules = [
      createMockSchedule({ checkOut: today }),
      createMockSchedule({ checkOut: addDays(today, 3) }),
      createMockSchedule({ checkOut: addDays(today, 10) }), // Next week
    ];

    // Simple week filter (7 days from today)
    const weekEnd = addDays(today, 6);
    const weekSchedules = schedules.filter(s => 
      isWithinInterval(s.checkOut, { start: today, end: weekEnd })
    );

    expect(weekSchedules).toHaveLength(2);
  });
});
