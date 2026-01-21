/**
 * Test Data Fixtures for E2E Tests
 * Provides consistent test data for all E2E scenarios
 */

export const TestUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'TestPassword123!',
    role: 'admin' as const,
  },
  manager: {
    email: 'manager@test.com', 
    password: 'TestPassword123!',
    role: 'manager' as const,
  },
  cleaner: {
    email: 'cleaner@test.com',
    password: 'TestPassword123!',
    role: 'cleaner' as const,
  },
};

export const TestProperties = {
  property1: {
    id: 'test-property-1',
    name: 'Casa de Praia',
    address: 'Rua da Praia, 100 - Florianópolis, SC',
    requireChecklist: true,
    requirePhotoPerCategory: true,
  },
  property2: {
    id: 'test-property-2',
    name: 'Apartamento Centro',
    address: 'Av. Brasil, 500 - São Paulo, SP',
    requireChecklist: true,
    requirePhotoPerCategory: false,
  },
};

export const TestSchedule = {
  pending: {
    id: 'test-schedule-pending',
    propertyName: 'Casa de Praia',
    status: 'waiting',
    checkOutTime: '11:00',
    checkInTime: '15:00',
  },
  released: {
    id: 'test-schedule-released',
    propertyName: 'Casa de Praia',
    status: 'released',
    checkOutTime: '11:00',
    checkInTime: '15:00',
  },
  cleaning: {
    id: 'test-schedule-cleaning',
    propertyName: 'Casa de Praia',
    status: 'cleaning',
    checkOutTime: '11:00',
    checkInTime: '15:00',
  },
};

export const ChecklistCategories = [
  {
    name: 'Cozinha',
    items: ['Limpar geladeira', 'Limpar fogão', 'Organizar armários'],
  },
  {
    name: 'Banheiro',
    items: ['Limpar box', 'Limpar vaso', 'Trocar toalhas'],
  },
  {
    name: 'Quarto',
    items: ['Trocar roupa de cama', 'Limpar piso', 'Organizar guarda-roupa'],
  },
];

export const IssueCategories = [
  { id: 'eletrico', name: 'Elétrico' },
  { id: 'hidraulico', name: 'Hidráulico' },
  { id: 'estrutural', name: 'Estrutural' },
  { id: 'mobiliario', name: 'Mobiliário' },
  { id: 'eletrodomesticos', name: 'Eletrodomésticos' },
  { id: 'outro', name: 'Outro' },
];

export const IssueItems = {
  eletrico: ['Interruptor', 'Tomada', 'Lâmpada', 'Ventilador', 'Ar condicionado'],
  hidraulico: ['Torneira', 'Chuveiro', 'Vaso sanitário', 'Caixa de descarga', 'Sifão'],
  estrutural: ['Porta', 'Janela', 'Fechadura', 'Piso', 'Parede'],
  mobiliario: ['Cama', 'Sofá', 'Mesa', 'Cadeira', 'Armário'],
  eletrodomesticos: ['Geladeira', 'Microondas', 'Máquina de lavar', 'Fogão', 'TV'],
};
