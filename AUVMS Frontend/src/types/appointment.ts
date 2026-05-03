export interface Visitor {
  id: string;
  name: string;
  email: string;
  phone: string;
  purpose: string;
  dateRequested: string;
  timeRequested: string;
  status: 'pending' | 'approved' | 'denied' | 'rejected' | 'rescheduled' | 'cancelled' | 'completed' | 'checked-in' | 'checked-out';
  otp?: string;
  vehicleNumber?: string;
  idProof?: string;
  submittedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  approvedBy?: string;
  deniedBy?: string;
  meetingPerson?: string;
  confirmedDate?: string;
  confirmedTime?: string;
  notes?: string;
  entryStatus?: 'not_arrived' | 'arrived' | 'in_meeting' | 'completed' | 'left';
  entryTime?: string;
  exitTime?: string;
  attendees?: { name: string; phone: string }[];
  // New fields for appointment management
  scheduledStart?: string;
  scheduledEnd?: string;
  rejectionReason?: string;
  departmentId?: string;
  department?: string;
}

export interface AppointmentLog {
  _id: string;
  appointmentId: string;
  action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'RESCHEDULED' | 'CANCELLED' | 'BULK_APPROVED' | 'BULK_REJECTED' | 'UPDATED' | 'CHECKED_IN' | 'CHECKED_OUT';
  performedBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  performedByRole: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentWithLogs extends Visitor {
  logs: AppointmentLog[];
}


export interface StaffAppointment {
  id: string;
  staffName: string;
  staffEmail: string;
  staffPhone: string;
  personToMeet:
  | 'Dr. N. Satish Reddy, Pro Chancellor'
  | 'Dr. M. Sreenivasa Reddy, Deputy Pro Chancellor'
  | 'Dr. M. B. Srinivas, Vice Chancellor'
  | 'Dr. S. Rama Sree, Pro-Vice Chancellor (Academics)'
  | 'Dr. A. Ramesh, Pro-Vice Chancellor (Engineering & Sciences)'
  | 'Dr. G. Suresh, Registrar'
  | 'Dr. M. Venkata Rajesh, Associate Dean (School of Engineering)'
  | 'Chairman'
  | 'Pro Chancellor'
  | 'Vice Chancellor'
  | 'Dean'
  | 'Other Staff'
  | 'Others';
  purpose: string;
  preferredDate: string;
  preferredTime: string;
  status: 'pending' | 'approved' | 'denied';
  submittedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  approvedBy?: string;
  deniedBy?: string;
  confirmedDate?: string;
  confirmedTime?: string;
  comments?: string;
}

export interface BookAppointmentPayload {
  requesterType: 'VISITOR' | 'STAFF' | 'ADMIN';
  bookingFor: 'myself' | 'someone_else';
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  personToMeet: MeetingPerson;
  staffId?: string;
  purpose: string;
  preferredDate: string;
  preferredTime: string;
  attendeesCount?: number;
  notes?: string;
  otherPersonName?: string;
  otherPersonEmail?: string;
  otherPersonPhone?: string;
}

export interface AppointmentRequest {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  purpose: string;
  meetingPerson: string;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'denied';
  otp?: string;
  submittedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  createdBy: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'staff' | 'pa' | 'admin';
  department?: string;
  designation?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  designation: string;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
  appointmentId?: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  todayTotal: number;
  todayCompleted: number;
  todayPending: number;
  weeklyTrend: number;
  monthlyTrend: number;
}

export interface TodayVisitor {
  id: string;
  name: string;
  purpose: string;
  meetingPerson: string;
  scheduledTime: string;
  entryStatus: 'not_arrived' | 'arrived' | 'in_meeting' | 'completed' | 'left';
  entryTime?: string;
  exitTime?: string;
  notes?: string;
  otp: string;
}

export interface PendingRequest {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  purpose: string;
  meetingPerson: string;
  requestedDate: string;
  requestedTime: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface FilterSettings {
  dateRange: { start: string; end: string };
  status: 'all' | 'pending' | 'approved' | 'denied';
  searchTerm: string;
  sortBy: 'date' | 'name' | 'status' | 'priority';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type AppointmentStatus = 'pending' | 'approved' | 'denied';
export type MeetingPerson =
  | 'Dr. N. Satish Reddy, Pro Chancellor'
  | 'Dr. M. Sreenivasa Reddy, Deputy Pro Chancellor'
  | 'Dr. M. B. Srinivas, Vice Chancellor'
  | 'Dr. S. Rama Sree, Pro-Vice Chancellor (Academics)'
  | 'Dr. A. Ramesh, Pro-Vice Chancellor (Engineering & Sciences)'
  | 'Dr. G. Suresh, Registrar'
  | 'Dr. M. Venkata Rajesh, Associate Dean (School of Engineering)'
  | 'Chairman'
  | 'Pro Chancellor'
  | 'Vice Chancellor'
  | 'Dean'
  | 'Other Staff'
  | 'Others';
export type EntryStatus = 'not_arrived' | 'arrived' | 'in_meeting' | 'completed' | 'left';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type Priority = 'low' | 'medium' | 'high';
