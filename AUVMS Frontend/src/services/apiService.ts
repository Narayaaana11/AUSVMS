import { toast } from 'sonner';
import type { Visitor, StaffAppointment, AppointmentRequest, FilterSettings, AppointmentLog, BookAppointmentPayload } from '@/types/appointment';

const API_BASE_URL = (() => {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!raw) return '/api';
  const trimmed = raw.replace(/\/+$/, '');
  if (/\/(api)(\/|$)/.test(trimmed)) return trimmed; // already includes /api
  return `${trimmed}/api`;
})();

class ApiService {
  // (removed) In-memory session state for Guard Portal interactions (entry/exit/flags)
  // All guard actions now rely solely on backend responses.

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      // Add auth token if available
      ...(localStorage.getItem('authToken') && {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      })
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: options.credentials ?? 'include',
    };

    try {
      const response = await fetch(url, config);
      if (response.status === 401) {
        // Attempt single refresh then retry once
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          const retryConfig: RequestInit = {
            ...config,
            headers: {
              ...defaultHeaders,
              ...(localStorage.getItem('authToken') && {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              }),
              ...options.headers,
            },
          };
          const retryRes = await fetch(url, retryConfig);
          if (!retryRes.ok) {
            const errorData = await retryRes.json().catch(() => ({}));
            const error = new Error(errorData.message || `HTTP error! status: ${retryRes.status}`) as any;
            (error as any).status = retryRes.status;
            throw error;
          }
          const retryText = await retryRes.text();
          return (retryText ? JSON.parse(retryText) : ({} as any)) as T;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP error! status: ${response.status}`) as any;
        (error as any).status = response.status;
        throw error;
      }

      // Allow 204/empty responses
      const text = await response.text();
      return (text ? JSON.parse(text) : ({} as any)) as T;
    } catch (error) {
      // Error handled locally in catch block
      throw error;
    }
  }

  // Fetch departments (public)
  async getDepartments(): Promise<Array<{ _id: string; name: string; code?: string }>> {
    try {
      // Try public list endpoint first
      const res = await this.request<{ success: boolean; data: { departments: any[] } }>("/departments/list");
      return (res?.data?.departments || []).map((d) => ({ _id: d._id, name: d.name, code: d.code }));
    } catch (error) {
      // Fallback to admin endpoint if user has access
      try {
        const res = await this.request<{ success: boolean; data: { departments: any[] } }>("/departments");
        return (res?.data?.departments || []).map((d) => ({ _id: d._id, name: d.name, code: d.code }));
      } catch {
        return [];
      }
    }
  }

  // Fetch public staff list for booking
  async listStaffPublic(): Promise<Array<{ _id: string; name: string; email?: string; department?: string }>> {
    const res = await this.request<any>("/users/staff");
    const arr = Array.isArray(res) ? res : (res?.data || []);
    return arr.map((u: any) => ({ _id: u._id, name: u.name || u.username, email: u.email, department: u.department }));
  }

  // Fetch staff appointments (with filters and pagination)
  async getStaffAppointments(filter?: Partial<FilterSettings>): Promise<{ appointments: Visitor[]; totalCount: number }> {
    const params = new URLSearchParams();
    if (filter?.status && filter.status !== 'all') params.set('status', filter.status);
    if (filter?.searchTerm) params.set('q', filter.searchTerm);
    if (filter?.dateRange?.start) params.set('from', filter.dateRange.start);
    if (filter?.dateRange?.end) params.set('to', filter.dateRange.end);
    if (filter?.sortBy) params.set('sortBy', filter.sortBy);
    if (filter?.sortOrder) params.set('sortOrder', filter.sortOrder);
    if (filter?.page) params.set('page', String(filter.page));
    if (filter?.pageSize) params.set('pageSize', String(filter.pageSize));

    try {
      const res = await this.request<{ appointments: any[]; totalCount: number }>(`/appointments/staff${params.toString() ? `?${params.toString()}` : ''}`);

      // Return raw data with all fields - let component handle formatting
      const mappedAppointments = (res.appointments || []).map((v) => ({
        ...v, // Keep all original fields
        id: v._id || v.id,
        name: v.name,
        email: v.email,
        phone: v.contactNumber,
        contactNumber: v.contactNumber,
        purpose: v.purposeOfVisit,
        purposeOfVisit: v.purposeOfVisit,
        meetingPerson: v.personToMeet,
        personToMeet: v.personToMeet,
        dateRequested: v.dateOfVisit,
        timeRequested: v.timeOfVisit,
        dateOfVisit: v.dateOfVisit,
        timeOfVisit: v.timeOfVisit,
        status: v.status,
        otp: v.visitorPassId,
        visitorPassId: v.visitorPassId,
        submittedAt: v.createdAt,
        createdAt: v.createdAt,
        vehicleNumber: v.vehicleNumber,
        attendees: v.attendees || [],
        checkInAt: v.checkInAt,
        checkOutAt: v.checkOutAt,
        otpExpiresAt: v.otpExpiresAt,
        otpAttempts: v.otpAttempts,
        maxOtpAttempts: v.maxOtpAttempts,
        rejectionReason: v.rejectionReason,
        rescheduleReason: v.rescheduleReason,
        notes: v.notes,
        department: v.department,
        staffId: v.staffId,
      })) as Visitor[];

      return { appointments: mappedAppointments, totalCount: res.totalCount };
    } catch (e: any) {
      if (e?.status === 404) return { appointments: [], totalCount: 0 };
      throw e;
    }
  }

  // Fetch all appointments (admin view - aliases to getVisitors)
  async getAppointments(): Promise<Visitor[]> {
    const res = await this.getVisitors();
    return res.items || [];
  }

  // Fetch staff's own appointment requests
  async getMyAppointmentRequests(): Promise<StaffAppointment[]> {
    try {
      const res = await this.request<any[]>('/appointments/my-requests');
      return (res || []).map((v) => ({
        id: v._id,
        name: v.name,
        email: v.email,
        phone: v.contactNumber,
        purpose: v.purposeOfVisit,
        meetingPerson: v.personToMeet,
        dateRequested: new Date(v.createdAt).toLocaleDateString(),
        timeRequested: new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: v.status,
        otp: v.visitorPassId,
        submittedAt: v.createdAt,
        vehicleNumber: v.vehicleNumber,
        attendees: v.attendees || [],
        preferredDate: v.dateOfVisit,
        preferredTime: v.timeOfVisit,
        staffName: '',
        staffEmail: '',
        staffPhone: '',
        personToMeet: v.personToMeet
      })) as unknown as StaffAppointment[];
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
  }

  // Approve appointment
  async approveAppointment(appointmentId: string): Promise<{ success: boolean; otp?: string }> {
    const result = await this.request<{ success: boolean; otp?: string }>(`/appointments/${appointmentId}/approve`, {
      method: 'POST'
    });
    return result;
  }

  // Deny appointment
  async denyAppointment(appointmentId: string, reason?: string): Promise<{ success: boolean }> {
    try {
      // Backend doesn't seem to have a specific deny endpoint in appointmentRoutes, 
      // but maybe it's handled via update status or just deletion?
      // For now, assume a hypothetical endpoint or use visitor update if possible.
      // Actually, I'll map it to visitor status update if possible or fail gracefully.
      // The UI expects deny, but backend only has approve.
      // Let's try to find if there is a 'reject' or similar.
      // visitorRoutes has updateVisitor.
      // For now, I'll leave it as is but point to a likely endpoint if it existed, or maybe visitor status update?
      // Let's use updateVisitorStatus
      return await this.updateVisitorStatus({ visitorId: appointmentId, status: 'rejected' });
    } catch (error) {
      toast.error('Deny not available');
      return { success: false } as any;
    }
  }

  // Book appointment with higher authority
  async bookAppointment(data: BookAppointmentPayload): Promise<{ success: boolean; appointmentId: string }> {
    try {
      // Determine which endpoint to use based on bookingFor field
      const endpoint = (data as any).bookingFor === 'someone_else'
        ? '/appointments/book-someone-else'
        : '/appointments/book';

      const result = await this.request<{ success: boolean; appointmentId: string; id?: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      toast.success((data as any).bookingFor === 'someone_else'
        ? 'Appointment created and approved! OTP sent to visitor.'
        : 'Appointment request submitted successfully!');
      return { success: result.success, appointmentId: result.appointmentId || result.id || '' };
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to submit appointment request';
      toast.error(errorMessage);
      throw error;
    }
  }

  // Grant appointment to visitor
  async grantAppointment(data: {
    visitorName: string;
    visitorEmail: string;
    visitorPhone: string;
    purpose: string;
    meetingPerson: string;
    date: string;
    time: string;
  }): Promise<{ success: boolean; otp: string }> {
    try {
      console.log('📤 API: Granting appointment:', data);
      const result = await this.request<{ success: boolean; otp: string }>('/appointments/grant', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      console.log('✅ API: Appointment granted successfully:', result);
      toast.success('Appointment granted successfully!');
      return result;
    } catch (error: any) {
      console.error('❌ API: Error granting appointment:', error);
      const errorMessage = error?.message || 'Failed to grant appointment';
      toast.error(errorMessage);
      throw error;
    }
  }

  // Get today's visitors
  async getTodayVisitors(): Promise<Visitor[]> {
    // Map backend /api/visitors to expected shape for today
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const params = new URLSearchParams({ from: start.toISOString(), to: end.toISOString() });
    const raw: any[] = await this.request<any[]>(`/visitors?${params.toString()}`);
    return (raw || []).map((v: any) => ({
      id: v._id,
      name: v.name,
      email: v.email,
      phone: v.contactNumber,
      purpose: v.purposeOfVisit,
      meetingPerson: v.personToMeet,
      dateRequested: v.createdAt,
      timeRequested: new Date(v.createdAt).toLocaleTimeString(),
      status: v.status,
      otp: v.visitorPassId,
      submittedAt: v.createdAt,
      entryTime: v.checkInAt,
      exitTime: v.checkOutAt,
      vehicleNumber: undefined,
    })) as any;
  }

  async verifyOTP(otp: string): Promise<{ success: boolean; message: string; visitorId?: string }> {
    try {
      const res = await this.request<{ success: boolean; visitorId?: string }>(`/otp/verify`, {
        method: 'POST',
        body: JSON.stringify({ otp }),
      });
      return { success: !!res.success, message: res.success ? 'Entry marked successfully' : 'Invalid or expired OTP', visitorId: res.visitorId };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Invalid or expired OTP' };
    }
  }

  async generateOtp(appointmentId: string): Promise<{ success: boolean; id?: string }> {
    try {
      const res = await this.request<{ id: string; success: boolean }>(`/otp/generate`, {
        method: 'POST',
        body: JSON.stringify({ appointmentId })
      });
      return res;
    } catch (e: any) {
      return { success: false };
    }
  }

  async searchVisitor(term: string): Promise<any | null> {
    // Local search over visitors list by passId/name/phone
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const params = new URLSearchParams({ from: start.toISOString() });
    const list: any[] = await this.request<any[]>(`/visitors?${params.toString()}`);
    const q = term.toLowerCase();
    const v = (list || []).find((x: any) =>
      x.visitorPassId === term || (x.name || '').toLowerCase().includes(q) || (x.contactNumber || '').includes(term)
    );
    if (!v) return null;
    return {
      id: v._id,
      visitorName: v.name,
      email: v.email,
      phone: v.contactNumber,
      purpose: v.purposeOfVisit,
      personToMeet: v.personToMeet,
      department: '—',
      appointmentTime: new Date(v.createdAt).toLocaleTimeString(),
      vehicleNumber: undefined,
      isFlagged: false,
      isExpired: false,
      entryTime: v.checkInAt,
      exitTime: v.checkOutAt,
      otp: v.visitorPassId,
    };
  }

  async searchVisitorForExit(term: string): Promise<any | null> {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const params = new URLSearchParams({ from: start.toISOString() });
    const list: any[] = await this.request<any[]>(`/visitors?${params.toString()}`);
    const q = term.toLowerCase();
    const v = (list || []).find((x: any) =>
      (x.checkInAt && !x.checkOutAt) && (x.visitorPassId === term || (x.name || '').toLowerCase().includes(q) || (x.contactNumber || '').includes(term))
    );
    if (!v) return null;
    return {
      id: v._id,
      visitorName: v.name,
      email: v.email,
      phone: v.contactNumber,
      purpose: v.purposeOfVisit,
      personToMeet: v.personToMeet,
      department: '—',
      appointmentTime: new Date(v.createdAt).toLocaleTimeString(),
      vehicleNumber: undefined,
      isFlagged: false,
      isExpired: false,
      entryTime: v.checkInAt,
      exitTime: v.checkOutAt,
      otp: v.visitorPassId,
    };
  }

  async markEntry(visitorId: string): Promise<{ success: boolean }> {
    await this.request(`/visitors/checkin/${visitorId}`, { method: 'PUT' });
    return { success: true };
  }

  async markExit(visitorId: string): Promise<{ success: boolean }> {
    await this.request(`/visitors/checkout/${visitorId}`, { method: 'PUT' });
    return { success: true };
  }

  async flagVisitor(visitorId: string): Promise<{ success: boolean }> {
    // Not implemented on backend; no-op
    return { success: false };
  }

  async requestReapproval(visitorId: string): Promise<{ success: boolean }> {
    // Not implemented on backend; no-op
    return { success: false };
  }

  // Get notifications
  async getNotifications(): Promise<Array<{ id: string, message: string, read: boolean, timestamp: string }>> {
    try {
      return await this.request<Array<{ id: string, message: string, read: boolean, timestamp: string }>>('/notifications');
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
  }

  async markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
    try {
      return await this.request<{ success: boolean }>(`/notifications/${notificationId}/read`, { method: 'PATCH' });
    } catch (e: any) {
      if (e?.status === 404) return { success: false };
      throw e;
    }
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    try {
      return await this.request<{ success: boolean }>(`/notifications/mark-all-read`, { method: 'PATCH' });
    } catch (e: any) {
      if (e?.status === 404) return { success: false };
      throw e;
    }
  }

  // Admin: Stats overview
  async getAdminStats(): Promise<{
    totals: { users: number; staff: number; guards: number };
    visitors: { today: number; pendingApprovals: number; checkedIn: number; checkedOut: number };
  }> {
    return await this.request('/admin/stats');
  }

  // Admin: Visitor logs with pagination and filters
  async getAdminVisitorLogs(params?: {
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    status?: string;
    q?: string;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    if (params?.status) search.set('status', params.status);
    if (params?.q) search.set('q', params.q);
    const qs = search.toString();
    return await this.request(`/admin/visitor-logs${qs ? `?${qs}` : ''}`);
  }

  // Admin: Export visitor logs - return a direct URL for download
  getAdminVisitorLogsExportUrl(params?: {
    format?: 'csv' | 'xlsx' | 'excel';
    from?: string;
    to?: string;
    status?: string;
    q?: string;
  }): string {
    const search = new URLSearchParams();
    if (params?.format) search.set('format', params.format);
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    if (params?.status) search.set('status', params.status);
    if (params?.q) search.set('q', params.q);
    const qs = search.toString();
    return `${API_BASE_URL}/admin/visitor-logs/export${qs ? `?${qs}` : ''}`;
  }

  // Get user profile
  async getUserProfile(): Promise<{ username: string, role: string, department?: string }> {
    return await this.request<{ username: string, role: string, department?: string }>('/auth/profile');
  }

  // Get all staff members/users
  async getStaffMembers(): Promise<Array<{
    id: string;
    name: string;
    department?: string;
    designation?: string;
    email: string;
    role: string;
  }>> {
    try {
      // Prefer public staff endpoint if available
      try {
        const users: any[] = await this.request<any[]>('/users/staff');
        return (users || []).map((u) => ({
          id: u._id,
          name: u.name || u.username,
          department: u.department,
          designation: u.designation,
          email: u.email,
          role: u.role,
        }));
      } catch { }
      const users: any[] = await this.request<any[]>('/users');
      return (users || []).map((u) => ({
        id: u._id,
        name: u.name || u.username,
        department: u.department,
        designation: u.designation,
        email: u.email,
        role: u.role,
      }));
    } catch (e: any) {
      if (e?.status === 404 || e?.status === 403) return [];
      throw e;
    }
  }

  // Admin: Users management
  async getUsers(params?: {
    q?: string;
    role?: 'admin' | 'staff' | 'pa' | 'guard' | 'security' | 'all';
    department?: string | 'all';
    status?: 'active' | 'disabled' | 'all';
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: Array<{ _id: string; username: string; name: string; email: string; role: string; department?: string; designation?: string; isActive?: boolean }>; total: number; page: number; pageSize: number }> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.role && params.role !== 'all') search.set('role', params.role);
    if (params?.department && params.department !== 'all') search.set('department', params.department);
    if (params?.status && params.status !== 'all') search.set('status', params.status);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    const qs = search.toString();
    const response = await this.request<{ success: boolean; data: any; message: string }>(`/users${qs ? `?${qs}` : ''}`);
    // Handle both old and new response formats
    return response.data || response;
  }
  async createUser(payload: { username: string; name: string; email: string; password: string; role: string; department?: string; designation?: string; }): Promise<any> {
    return await this.request('/users/create', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateUser(id: string, payload: Partial<{ name: string; email: string; role: string; department?: string; designation?: string; isActive?: boolean; }>): Promise<any> {
    return await this.request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async toggleUserActive(id: string): Promise<{ id: string; isActive: boolean }> {
    return await this.request(`/users/${id}/toggle-active`, { method: 'PATCH' });
  }

  async resetUserPassword(id: string, newPassword: string): Promise<{ message: string }> {
    return await this.request(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) });
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    return await this.request(`/users/${id}`, { method: 'DELETE' });
  }

  // Get appointment statistics
  async getAppointmentStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    denied: number;
    todayTotal: number;
    todayCompleted: number;
  }> {
    const data = await this.request<{
      total: number;
      pending: number;
      approved: number;
      denied: number;
      todayTotal: number;
      todayCompleted: number;
    }>('/appointments/stats');
    return data;
  }

  // Staff Analytics
  async getStaffOverview(): Promise<{
    totalAppointments: number;
    pendingRequests: number;
    approvedToday: number;
    deniedRequests: number;
    insideCampus: number;
    completedToday: number;
  }> {
    const res = await this.request<{ success: boolean; data: any }>('/analytics/staff-overview');
    return res.data;
  }

  // NEW: Get staff dashboard stats from dedicated endpoint
  async getStaffDashboardStats(): Promise<{
    totalAppointments: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const res = await this.request<{ success: boolean; data: any }>('/appointments/dashboard/staff-stats');
    return res.data;
  }

  async getRecentActivity(limit: number = 20): Promise<AppointmentLog[]> {
    const res = await this.request<{ success: boolean; data: any[] }>(`/analytics/activity/recent?limit=${limit}`);
    return res.data;
  }

  // Reschedule appointment
  async rescheduleAppointment({ appointmentId, newDate, newTime }: { appointmentId: string; newDate: string; newTime: string }): Promise<{ success: boolean }> {
    try {
      return await this.request(`/appointments/${appointmentId}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ newPreferredDate: newDate, newPreferredTime: newTime })
      });
    } catch (e: any) {
      if (e?.status === 404) return { success: false };
      throw e;
    }
  }

  // Visitor notes and status
  async addVisitorNote({ visitorId, note }: { visitorId: string; note: string }): Promise<{ success: boolean }> {
    try {
      return await this.request('/visitors/add-note', {
        method: 'POST',
        body: JSON.stringify({ visitorId, note })
      });
    } catch (e: any) {
      if (e?.status === 404) return { success: false };
      throw e;
    }
  }

  async updateVisitorStatus({ visitorId, status }: { visitorId: string; status: string }): Promise<{ success: boolean }> {
    try {
      return await this.request('/visitors/update-status', {
        method: 'POST',
        body: JSON.stringify({ visitorId, status })
      });
    } catch (e: any) {
      if (e?.status === 404) return { success: false };
      throw e;
    }
  }

  // Public visitor appointment submission (not supported by backend -> graceful fallback)
  async submitVisitorAppointment(payload: {
    visitorName: string;
    visitorEmail: string;
    visitorPhone: string;
    purpose: string;
    personToMeet: string;
    attendees: Array<{ name: string; phone: string }>;
  }): Promise<{ success: boolean; id?: string; status?: string }> {
    const res = await this.request<{ id: string; success: boolean; status: string }>('/appointments/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res as any;
  }

  /**
   * Book appointment for someone else (Staff pre-approves visitor)
   * This creates an auto-approved appointment
   */
  async bookAppointmentSomeoneElse(payload: {
    visitorName: string;
    visitorEmail: string;
    visitorPhone: string;
    purpose: string;
    attendees: Array<{ name: string; phone: string }>;
    additionalAttendees: number;
    preferredDate: string;
    preferredTime: string;
  }): Promise<{ success: boolean; id?: string; status?: string; message?: string }> {
    const res = await this.request<{ id: string; success: boolean; status: string; message: string }>('/appointments/book-someone-else', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res as any;
  }

  // ============ GUARD PORTAL ============
  async verifyEntry(otp: string): Promise<{ success: boolean; message: string; visitor?: any }> {
    return await this.request('/guard/verify-entry', {
      method: 'POST',
      body: JSON.stringify({ otp })
    });
  }

  async verifyExit(otp: string): Promise<{ success: boolean; message: string; visitor?: any }> {
    return await this.request('/guard/verify-exit', {
      method: 'POST',
      body: JSON.stringify({ otp })
    });
  }

  async searchVisitorGuard(q: string): Promise<any[]> {
    return await this.request(`/guard/search?q=${encodeURIComponent(q)}`);
  }

  /**
   * Admin: Regenerate OTP for an appointment
   */
  async regenerateOTP(appointmentId: string): Promise<{ success: boolean; message: string; data: { otp: string } }> {
    return await this.request(`/appointments/${appointmentId}/otp/regenerate`, {
      method: 'POST'
    });
  }

  // User profile and settings
  async updateUserProfile(payload: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      return await this.request('/user/profile', { method: 'PATCH', body: JSON.stringify(payload) });
    } catch (e: any) {
      if (e?.status === 404) return { success: false };
      throw e;
    }
  }

  // Backwards-compatible alias used in some pages
  async updateProfile(payload: Record<string, unknown>): Promise<{ success: boolean }> {
    return await this.updateUserProfile(payload);
  }

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<{ success: boolean }> {
    try {
      return await this.request('/user/change-password', { method: 'POST', body: JSON.stringify(payload) });
    } catch (e: any) {
      if (e?.status === 404) return { success: false };
      throw e;
    }
  }

  async updateSettings(payload: Record<string, unknown>): Promise<{ success: boolean }> {
    return await this.request('/user/settings', { method: 'PATCH', body: JSON.stringify(payload) });
  }

  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: { username: string; role: string; department?: string } }> {
    return await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({} as any));
      if (data?.token) {
        localStorage.setItem('authToken', data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Note: All mock helpers and dev fallbacks removed to ensure backend-only data

  // ============ DEPARTMENT MANAGEMENT ============
  async getDepartments(params?: { isActive?: string }): Promise<{ success: boolean; data: { departments: any[]; totalDepartments: number; activeDepartments: number; totalLocations: number }; message: string }> {
    const search = new URLSearchParams();
    if (params?.isActive) search.set('isActive', params.isActive);
    const qs = search.toString();
    // Use /list endpoint for public access (no admin role required)
    return await this.request(`/departments/list${qs ? `?${qs}` : ''}`);
  }

  async getDepartmentById(id: string): Promise<{ success: boolean; data: any; message: string }> {
    return await this.request(`/departments/${id}`);
  }

  async getDepartmentSummary(): Promise<{ success: boolean; data: { totalDepartments: number; activeDepartments: number; totalLocations: number; defaultActiveHours: { startTime: string; endTime: string } }; message: string }> {
    return await this.request('/departments/summary');
  }

  async createDepartment(payload: any): Promise<{ success: boolean; data: any; message: string }> {
    return await this.request('/departments', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateDepartment(id: string, payload: any): Promise<{ success: boolean; data: any; message: string }> {
    return await this.request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async deleteDepartment(id: string): Promise<{ success: boolean; message: string }> {
    return await this.request(`/departments/${id}`, { method: 'DELETE' });
  }

  // ============ HOLIDAYS & SPECIAL DAYS ============
  async getHolidays(params?: { page?: number; pageSize?: number; type?: string }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return await this.request(`/holidays${qs ? `?${qs}` : ''}`);
  }

  async getHolidayById(id: string): Promise<any> {
    return await this.request(`/holidays/${id}`);
  }

  async getUpcomingHolidays(): Promise<any[]> {
    return await this.request('/holidays/upcoming');
  }

  async createHoliday(payload: any): Promise<any> {
    return await this.request('/holidays', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateHoliday(id: string, payload: any): Promise<any> {
    return await this.request(`/holidays/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async deleteHoliday(id: string): Promise<any> {
    return await this.request(`/holidays/${id}`, { method: 'DELETE' });
  }

  // ============ NOTIFICATION TEMPLATES ============
  async getNotificationTemplates(params?: { page?: number; pageSize?: number }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return await this.request(`/notifications/templates${qs ? `?${qs}` : ''}`);
  }

  async getNotificationTemplateById(id: string): Promise<any> {
    return await this.request(`/notifications/templates/${id}`);
  }

  async createNotificationTemplate(payload: any): Promise<any> {
    return await this.request('/notifications/templates', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateNotificationTemplate(id: string, payload: any): Promise<any> {
    return await this.request(`/notifications/templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async deleteNotificationTemplate(id: string): Promise<any> {
    return await this.request(`/notifications/templates/${id}`, { method: 'DELETE' });
  }

  // ============ INTEGRATIONS ============
  async getIntegrations(params?: { page?: number; pageSize?: number; type?: string }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const search = new URLSearchParams();
    if (params?.type && params.type !== 'all') search.set('type', params.type);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return await this.request(`/integrations${qs ? `?${qs}` : ''}`);
  }

  async getIntegrationById(id: string): Promise<any> {
    return await this.request(`/integrations/${id}`);
  }



  async createIntegration(payload: any): Promise<any> {
    return await this.request('/integrations', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateIntegration(id: string, payload: any): Promise<any> {
    return await this.request(`/integrations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async deleteIntegration(id: string): Promise<any> {
    return await this.request(`/integrations/${id}`, { method: 'DELETE' });
  }

  async testIntegration(id: string): Promise<any> {
    return await this.request(`/integrations/${id}/test`, { method: 'POST' });
  }



  // ============ ANALYTICS & REPORTING ============
  async getDashboardAnalytics(days?: number): Promise<any> {
    const params = new URLSearchParams();
    if (days) params.set('days', String(days));
    return await this.request(`/admin/analytics${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getAuditLogs(params?: { page?: number; pageSize?: number; type?: string; userId?: string }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.userId) search.set('userId', params.userId);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return await this.request(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
  }

  async getSystemMetrics(): Promise<any> {
    return await this.request('/admin/metrics');
  }

  // ============ DEDICATED ANALYTICS ENDPOINTS ============
  async getAnalyticsOverview(): Promise<{
    activeVisitors: number;
    checkedOutToday: number;
    totalUsers: number;
    pendingApprovals: number;
    totalVisitorsThisMonth: number;
    avgVisitDurationMinutes: number;
    successRate: number;
    peakHour: string;
  }> {
    const res = await this.request<{ success: boolean; data: any; message: string }>('/analytics/overview');
    return res.data;
  }

  async getVisitorTrends(range?: '7d' | '30d'): Promise<Array<{ date: string; count: number }>> {
    const params = new URLSearchParams();
    if (range) params.set('range', range);
    const res = await this.request<{ success: boolean; data: any[]; message: string }>(`/analytics/visitor-trends${params.toString() ? `?${params.toString()}` : ''}`);
    return res.data;
  }

  async getDepartmentDistribution(range?: string): Promise<Array<{ department: string; count: number }>> {
    const params = new URLSearchParams();
    if (range) params.set('range', range);
    const res = await this.request<{ success: boolean; data: any[]; message: string }>(`/analytics/department-distribution${params.toString() ? `?${params.toString()}` : ''}`);
    return res.data;
  }

  async getProcessingMetrics(): Promise<{
    avgProcessingTimeHours: number;
    avgVisitDurationMinutes: number;
    monthlyVisitors: number;
  }> {
    const res = await this.request<{ success: boolean; data: any; message: string }>('/analytics/processing-metrics');
    return res.data;
  }

  // ============ REPORTS ============
  async getDailyReport(date?: string): Promise<any> {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    return await this.request(`/reports/daily${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getMonthlyReport(month?: string, year?: string): Promise<any> {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year) params.set('year', year);
    return await this.request(`/reports/monthly${params.toString() ? `?${params.toString()}` : ''}`);
  }

  getReportExportUrl(type: 'daily' | 'monthly', date: string): string {
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('date', date);
    return `${API_BASE_URL}/reports/export?${params.toString()}`;
  }

  // ============ MORE VISITOR METHODS ============
  async getVisitors(params?: { page?: number; pageSize?: number; q?: string; status?: string }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status) search.set('status', params.status);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return await this.request(`/visitors${qs ? `?${qs}` : ''}`);
  }

  async deleteVisitor(id: string): Promise<any> {
    return await this.request(`/visitors/${id}`, { method: 'DELETE' });
  }

  async getVisitorById(id: string): Promise<any> {
    return await this.request(`/visitors/${id}`);
  }

  async updateVisitor(id: string, payload: any): Promise<any> {
    // If payload contains a file (photo), use FormData
    if (payload instanceof FormData) {
      // Custom request for FormData as the default helper sets JSON headers
      const url = `${API_BASE_URL}/visitors/${id}`;
      const headers: any = {};
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers,
          body: payload
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Update failed');
        }
        return await response.json();
      } catch (error) {
        throw error;
      }
    }

    return await this.request(`/visitors/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  // ============ SYSTEM CONFIGURATION ============
  async getSystemConfig(key: string): Promise<any> {
    try {
      const res = await this.request<{ key: string; value: any }>(`/system-config/${key}`);
      return res.value || null;
    } catch (e: any) {
      if (e?.status === 404) return null;
      throw e;
    }
  }

  async updateSystemConfig(key: string, value: any): Promise<any> {
    return await this.request(`/system-config/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });
  }

  // ============ APPOINTMENT MANAGEMENT (ENHANCED) ============

  /**
   * Reject a single appointment with reason
   */
  async rejectAppointmentWithReason(id: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.request<{ success: boolean; message: string }>(`/appointments/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      return result;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointmentWithReason(id: string, data: {
    newPreferredDate: string;
    newPreferredTime: string;
    reason: string;
    scheduledStart?: string;
    scheduledEnd?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.request<{ success: boolean; message: string }>(`/appointments/${id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      return result;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Bulk approve or reject appointments (Admin only)
   */
  async bulkActionAppointments(data: {
    action: 'APPROVE' | 'REJECT';
    appointmentIds: string[];
    reason?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      totalProcessed: number;
      successCount: number;
      failureCount: number;
      results: Array<{ id: string; success: boolean; error?: string }>;
    };
  }> {
    try {
      const result = await this.request<any>('/appointments/bulk-action', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return result;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get appointment logs (audit trail)
   */
  async getAppointmentLogs(id: string): Promise<AppointmentLog[]> {
    try {
      const result = await this.request<{ success: boolean; data: any[] }>(`/appointments/${id}/logs`);
      return result.data || [];
    } catch (error: any) {
      if (error?.status === 404) return [];
      throw error;
    }
  }

  /**
   * Get appointments for admin with advanced filters
   */
  async getAppointmentsAdmin(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    department?: string; // Changed from departmentId to department to match UI/Backend
    departmentId?: string; // Keep for backward compatibility if needed
    otpStatus?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    success: boolean;
    data: any[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.department && params.department !== 'all') searchParams.set('department', params.department);
    if (params?.departmentId) searchParams.set('departmentId', params.departmentId);
    if (params?.otpStatus && params.otpStatus !== 'all') searchParams.set('otpStatus', params.otpStatus);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params?.toDate) searchParams.set('toDate', params.toDate);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const qs = searchParams.toString();
    return await this.request(`/appointments${qs ? `?${qs}` : ''}`);
  }

  /**
   * Get enhanced appointment statistics
   */
  async getEnhancedAppointmentStats(filters?: {
    departmentId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
    rescheduled: number;
    cancelled: number;
  }> {
    const searchParams = new URLSearchParams();
    if (filters?.departmentId) searchParams.set('departmentId', filters.departmentId);
    if (filters?.fromDate) searchParams.set('fromDate', filters.fromDate);
    if (filters?.toDate) searchParams.set('toDate', filters.toDate);

    const qs = searchParams.toString();
    const result = await this.request<{ success: boolean; data: any }>(`/appointments/stats${qs ? `?${qs}` : ''}`);
    return result.data || result;
  }

  /**
   * Resend OTP to visitor
   */
  async resendOTP(appointmentId: string): Promise<{ success: boolean; message: string; sentTo: { email: string | null; phone: string | null } }> {
    try {
      const result = await this.request<{ success: boolean; message: string; sentTo: { email: string | null; phone: string | null } }>(
        `/appointments/${appointmentId}/otp/resend`,
        { method: 'POST' }
      );
      return result;
    } catch (error: any) {
      throw error;
    }
  }

}

export const apiService = new ApiService();
