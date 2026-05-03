import { toast } from 'sonner';

const API_BASE_URL = (() => {
    const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (!raw) return '/api';
    const trimmed = raw.replace(/\/+$/, '');
    if (/\/(api)(\/|$)/.test(trimmed)) return trimmed;
    return `${trimmed}/api`;
})();

/**
 * Requests API Service
 * Handles all incoming appointment requests operations
 */

export interface RequestFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    staffId?: string;
    departmentId?: string;
    fromDate?: string;
    toDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface Request {
    _id: string;
    visitorName: string;
    visitorEmail: string;
    visitorPhone: string;
    staffId?: string;
    staffName?: string;
    departmentId?: string;
    purpose: string;
    preferredDate: string;
    preferredTime: string;
    status: string;
    otpStatus?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    createdAt: string;
    updatedAt: string;
    rejectionReason?: string;
    rescheduleReason?: string;
    notes?: string;
}

export interface RequestsResponse {
    success: boolean;
    data: {
        requests: Request[];
        total: number;
        page: number;
        pageCount: number;
        limit: number;
    };
}

export interface BulkActionResult {
    success: boolean;
    message: string;
    data: {
        total: number;
        successCount: number;
        failCount: number;
        failures: Array<{ id: string; error: string }>;
    };
}

export interface RequestStats {
    success: boolean;
    data: {
        totalRequests: number;
        pendingRequests: number;
        approvedRequests: number;
        rejectedRequests: number;
        rescheduledRequests: number;
    };
}

export interface AppointmentLog {
    _id: string;
    appointmentId: string;
    action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'RESCHEDULED' | 'CHECKIN' | 'CHECKOUT';
    performedBy: string;
    reason?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    createdAt: string;
}

export interface GenericResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

class RequestsApi {
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            return (text ? JSON.parse(text) : {}) as T;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'API request failed';
            // Error logged locally for debugging
            throw error;
        }
    }

    /**
     * Get paginated and filtered requests
     */
    async getRequests(filters: RequestFilters = {}): Promise<RequestsResponse> {
        const params = new URLSearchParams();

        if (filters.page) params.set('page', String(filters.page));
        if (filters.limit) params.set('limit', String(filters.limit));
        if (filters.search) params.set('search', filters.search);
        if (filters.status) params.set('status', filters.status);
        if (filters.staffId) params.set('staffId', filters.staffId);
        if (filters.departmentId) params.set('departmentId', filters.departmentId);
        if (filters.fromDate) params.set('fromDate', filters.fromDate);
        if (filters.toDate) params.set('toDate', filters.toDate);
        if (filters.sortBy) params.set('sortBy', filters.sortBy);
        if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

        const queryString = params.toString();
        return this.request<RequestsResponse>(
            `/requests${queryString ? `?${queryString}` : ''}`
        );
    }

    /**
     * Get single request by ID with logs
     */
    async getRequestById(id: string): Promise<GenericResponse<Request>> {
        return this.request(`/requests/${id}`);
    }

    /**
     * Approve a request
     */
    async approveRequest(
        id: string,
        data?: { scheduledStart?: string; scheduledEnd?: string; note?: string }
    ): Promise<GenericResponse<Request>> {
        return this.request(`/requests/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify(data || {}),
        });
    }

    /**
     * Reject a request
     */
    async rejectRequest(id: string, reason: string): Promise<GenericResponse<Request>> {
        return this.request(`/requests/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    /**
     * Reschedule a request
     */
    async rescheduleRequest(
        id: string,
        data: { newPreferredDate: string; newPreferredTime: string; reason: string }
    ): Promise<GenericResponse<Request>> {
        return this.request(`/requests/${id}/reschedule`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Bulk action on requests
     */
    async bulkAction(
        action: 'APPROVE' | 'REJECT',
        appointmentIds: string[],
        reason?: string,
        scheduledStart?: string
    ): Promise<BulkActionResult> {
        return this.request<BulkActionResult>('/requests/bulk-action', {
            method: 'POST',
            body: JSON.stringify({
                action,
                appointmentIds,
                reason,
                scheduledStart,
            }),
        });
    }

    /**
     * Get appointment logs
     */
    async getAppointmentLogs(id: string): Promise<GenericResponse<AppointmentLog[]>> {
        return this.request(`/requests/${id}/logs`);
    }

    /**
     * Export requests to CSV
     */
    getExportUrl(filters: Partial<RequestFilters> = {}): string {
        const params = new URLSearchParams();

        if (filters.status) params.set('status', filters.status);
        if (filters.staffId) params.set('staffId', filters.staffId);
        if (filters.departmentId) params.set('departmentId', filters.departmentId);
        if (filters.fromDate) params.set('fromDate', filters.fromDate);
        if (filters.toDate) params.set('toDate', filters.toDate);

        const queryString = params.toString();
        const token = localStorage.getItem('authToken');

        // Return URL with auth token in header (will be handled by download function)
        return `${API_BASE_URL}/requests/export${queryString ? `?${queryString}` : ''}`;
    }

    /**
     * Export requests to CSV returning JSON
     */
    async exportRequests(filters: Partial<RequestFilters> = {}): Promise<{ success: boolean; data: { csv: string } }> {
        const params = new URLSearchParams();

        if (filters.status) params.set('status', filters.status);
        if (filters.staffId) params.set('staffId', filters.staffId);
        if (filters.departmentId) params.set('departmentId', filters.departmentId);
        if (filters.fromDate) params.set('fromDate', filters.fromDate);
        if (filters.toDate) params.set('toDate', filters.toDate);

        const queryString = params.toString();

        // This endpoint logic depends on how backend implements export.
        // Assuming backend returns { success: true, data: { csv: "..." } } 
        // OR returns raw CSV with appropriate headers.
        // The implementation_plan assumed JSON response. If backend sends raw CSV, use .text().

        // Let's use request<T> wrapper but handle raw text if backend returns CSV string.
        // But request wrapper expects JSON.
        // So we will manually fetch here to be safe and format as expected { success: true, data: { csv: ... } }

        const url = `${API_BASE_URL}/requests/export${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Accept': 'text/csv, application/json' // Accept both
            },
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            // Assume raw CSV
            const text = await response.text();
            return { success: true, data: { csv: text } };
        }
    }

    /**
     * Regenerate OTP (Admin only)
     */
    async regenerateOTP(id: string): Promise<{ success: boolean; data: { otp: string; expiresAt: string } }> {
        return this.request(`/requests/${id}/otp/regenerate`, {
            method: 'POST',
        });
    }

    /**
     * Get request statistics
     */
    async getRequestStats(): Promise<RequestStats> {
        return this.request<RequestStats>('/requests/stats');
    }
}

export const requestsApi = new RequestsApi();
export default requestsApi;
