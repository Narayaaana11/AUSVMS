export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'pa' | 'chairman' | 'security_admin';
  department: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Guard {
  id: string;
  name: string;
  staffId: string;
  location: string;
  status: 'active' | 'offline';
  activityLogs: GuardActivity[];
}

export interface GuardActivity {
  id: string;
  action: 'otp_verification' | 'entry_log' | 'exit_log' | 'alert_raised';
  visitorName?: string;
  otp?: string;
  timestamp: Date;
  details: string;
}

export interface SecurityAlert {
  id: string;
  visitorName: string;
  reason: string;
  time: Date;
  raisedBy: string;
  status: 'open' | 'assigned' | 'resolved';
  assignedTo?: string;
  resolutionNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface SystemSettings {
  otpValidity: number; // minutes
  appointmentExpiry: number; // minutes
  photoCaptureEnabled: boolean;
  universityLogo?: string;
  universityContact: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  smsProvider: 'twilio' | 'msg91' | 'fast2sms';
  allowWeekendAppointments: boolean;
}

export interface DashboardStats {
  totalAppointmentsToday: number;
  pendingApprovals: number;
  visitorsInsideCampus: number;
  securityAlerts: number;
}

export interface AppointmentFilters {
  date?: Date;
  status?: string;
  staffMember?: string;
  search?: string;
}

export interface BulkAction {
  appointmentIds: string[];
  action: 'approve' | 'deny' | 'cancel';
}

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  type: 'daily' | 'weekly' | 'monthly';
  department?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  timestamp: Date;
  targetType: 'appointment' | 'staff' | 'alert' | 'system';
  targetId?: string;
}
