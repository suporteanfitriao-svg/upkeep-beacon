export type ScheduleStatus = 'waiting' | 'released' | 'cleaning' | 'completed';

export type MaintenanceStatus = 'ok' | 'needs_maintenance' | 'in_progress';

export type Priority = 'high' | 'medium' | 'low';

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  category: string;
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

export interface Schedule {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
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
  notes: string;
  teamArrival?: Date;
  teamDeparture?: Date;
  missingMaterials: string[];
  doorPassword?: string;
}

export interface DashboardStats {
  waiting: number;
  released: number;
  cleaning: number;
  completed: number;
  maintenanceAlerts: number;
}
