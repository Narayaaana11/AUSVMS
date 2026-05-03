/**
 * Unified TypeScript Types for AUVMS Frontend
 */

// ==================== Appointment/Visitor Types ====================

export interface Visitor {
  _id: string;
  visitorPassId: string;
  name: string;
  email?: string;
  contactNumber: string;
  purposeOfVisit: string;
  personToMeet: string;
  staffId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'checkedIn' | 'checkedOut';
  dateOfVisit?: string;
  timeOfVisit?: string;
  otpHash?: string;
  otpExpiresAt?: string;
  checkInAt?: string;
  checkOutAt?: string;
  createdAt: string;
  updatedAt: string;
  Photo?: string;
  requesterType?: 'VISITOR' | 'STAFF';
  requesterId?: string;
  requesterName?: string;
  bookingMode?: 'VISITOR' | 'SOMEONE_ELSE';
  attendees?: string[];
  additionalAttendees?: number;
  notes?: string;
}

export interface Appointment extends Visitor {
  // Extended type alias for compatibility
}

// ==================== Request/Approval Types ====================

export interface AppointmentApprovalEvent {
  id: string;
  visitorName: string;
  personToMeet: string;
  purpose: string;
  status: 'approved';
  dateOfVisit?: string;
  timeOfVisit?: string;
  approvedAt: string;
  approvedBy: {
    id: string;
    name: string;
    role: string;
  };
}

export interface IncomingRequestEvent {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  purpose: string;
  status: 'pending';
  dateOfVisit?: string;
  timeOfVisit?: string;
  requesterName: string;
  requesterEmail: string;
  createdAt: string;
}

export interface NotificationEvent {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  appointmentId?: string;
  duration?: number;
}

// ==================== WebSocket Event Types ====================

export interface WebSocketEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: string;
}

// ==================== User/Auth Types ====================

export interface User {
  _id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'guard' | 'security' | 'user';
  isActive: boolean;
  department?: string;
  phone?: string;
  contactNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  // Extended type for profile endpoints
}

// ==================== API Response Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  status?: number;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  message?: string;
}

// ==================== Form/Input Types ====================

export interface AppointmentFormData {
  visitorName: string;
  visitorEmail?: string;
  visitorPhone: string;
  purpose: string;
  personToMeet: string;
  staffId?: string;
  preferredDate: string;
  preferredTime: string;
  attendees?: string[];
  additionalAttendees?: number;
  notes?: string;
}

export interface BookAppointmentFormData extends AppointmentFormData {
  // Extends AppointmentFormData for staff booking
}

// ==================== Dashboard/Analytics Types ====================

export interface DashboardStats {
  totalAppointments: number;
  pendingRequests: number;
  approvedAppointments: number;
  rejectedAppointments: number;
  avgProcessingTime: number;
  todayCheckIns: number;
  thisMonthAppointments: number;
}

export interface StaffStats extends DashboardStats {
  myAppointments: number;
  myPendingRequests: number;
}

// ==================== Filter/Search Types ====================

export interface AppointmentFilters {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  staffId?: string;
  sortBy?: 'createdAt' | 'dateOfVisit' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ==================== Log/Audit Types ====================

export interface AppointmentLog {
  _id: string;
  appointmentId: string;
  action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'RESCHEDULED' | 'CHECKIN' | 'CHECKOUT';
  performedBy: string;
  performedByName?: string;
  reason?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ==================== Email/Notification Config Types ====================

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  senderEmail: string;
  senderName: string;
  authEmail: string;
  authPassword?: string;
  isConfigured: boolean;
}

export interface NotificationConfig {
  type: 'SMTP' | 'SMS';
  provider: string;
  isActive: boolean;
  testStatus: 'not_tested' | 'success' | 'failed';
  lastTestedAt?: string;
}
