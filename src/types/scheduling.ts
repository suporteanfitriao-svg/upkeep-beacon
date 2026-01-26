export type ScheduleStatus = 'waiting' | 'released' | 'cleaning' | 'completed';

export type MaintenanceStatus = 'ok' | 'needs_maintenance' | 'in_progress';

export type Priority = 'high' | 'medium' | 'low';

export type AppRole = 'admin' | 'manager' | 'cleaner';

export type ChecklistItemStatus = 'pending' | 'ok' | 'not_ok';

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  category: string;
  status?: ChecklistItemStatus; // 'pending' | 'ok' | 'not_ok' - tracks if marked as OK or NOT OK
}

export interface PhotoUpload {
  id: string;
  type: 'before' | 'after';
  url: string;
  uploadedAt: Date;
}

export interface MaintenanceIssue {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  reportedAt: Date;
  resolved: boolean;
}

export interface ScheduleHistoryEvent {
  timestamp: string;
  team_member_id: string;
  team_member_name: string | null;
  role: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  payload?: Record<string, unknown>;
}

export interface TeamMemberAck {
  team_member_id: string;
  acknowledged_at: string;
}

export interface CategoryPhoto {
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface Schedule {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  propertyImageUrl?: string;
  propertyLatitude?: number;
  propertyLongitude?: number;
  guestName: string;
  numberOfGuests: number;
  checkIn: Date;
  checkOut: Date;
  status: ScheduleStatus;
  maintenanceStatus: MaintenanceStatus;
  priority: Priority;
  cleanerName: string;
  cleanerAvatar?: string;
  estimatedDuration: number; // in minutes
  checklist: ChecklistItem[];
  photos: PhotoUpload[];
  maintenanceIssues: MaintenanceIssue[];
  notes: string; // Admin notes visible to cleaner
  cleanerObservations?: string; // Cleaner observations visible to admin
  teamArrival?: Date;
  teamDeparture?: Date;
  missingMaterials: string[];
  doorPassword?: string;
  // New fields for status flow
  startAt?: Date;
  endAt?: Date;
  responsibleTeamMemberId?: string;
  importantInfo?: string;
  ackByTeamMembers: TeamMemberAck[];
  history: ScheduleHistoryEvent[];
  isActive: boolean;
  checklistLoadedAt?: Date;
  adminRevertReason?: string;
  accessPassword?: string;
  categoryPhotos?: Record<string, CategoryPhoto[]>;
}

export interface DashboardStats {
  waiting: number;
  released: number;
  cleaning: number;
  completed: number;
  maintenanceAlerts: number;
  delayed: number;
}

// Status flow validation
export const STATUS_FLOW: Record<ScheduleStatus, ScheduleStatus | null> = {
  waiting: 'released',
  released: 'cleaning',
  cleaning: 'completed',
  completed: null,
};

export const STATUS_LABELS: Record<ScheduleStatus, string> = {
  waiting: 'Aguardando Liberação',
  released: 'Liberado',
  cleaning: 'Em Limpeza',
  completed: 'Finalizado',
};

// Roles that can transition to each status
// REGRA: Anfitrião (manager) pode LIBERAR mas NÃO pode iniciar/finalizar limpeza
export const STATUS_ALLOWED_ROLES: Record<ScheduleStatus, AppRole[]> = {
  waiting: [], // Can't transition TO waiting (only revert by admin)
  released: ['admin', 'manager'], // Anfitrião pode liberar
  cleaning: ['admin', 'cleaner'], // Anfitrião NÃO pode iniciar limpeza - apenas cleaner ou admin
  completed: ['admin', 'cleaner'], // Anfitrião NÃO pode finalizar limpeza - apenas cleaner ou admin
};
