import { useState, useEffect, useCallback } from 'react';
import { requestsApi, type RequestFilters, type Request } from '@/services/requestsApi';
import { toast } from 'sonner';

export interface UseRequestsResult {
    requests: Request[];
    total: number;
    page: number;
    pageCount: number;
    loading: boolean;
    error: string | null;
    filters: RequestFilters;
    setFilters: (filters: Partial<RequestFilters>) => void;
    refreshRequests: () => Promise<void>;
    approveRequest: (id: string, data?: any) => Promise<boolean>;
    rejectRequest: (id: string, reason: string) => Promise<boolean>;
    rescheduleRequest: (id: string, data: any) => Promise<boolean>;
    bulkApprove: (ids: string[], scheduledStart?: string) => Promise<boolean>;
    bulkReject: (ids: string[], reason: string) => Promise<boolean>;
    exportRequests: () => Promise<void>;
}

export function useRequests(initialFilters: RequestFilters = {}): UseRequestsResult {
    const [requests, setRequests] = useState<Request[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(initialFilters.page || 1);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFiltersState] = useState<RequestFilters>({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...initialFilters,
    });

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await requestsApi.getRequests(filters);

            if (response.success && response.data) {
                setRequests(response.data.requests);
                setTotal(response.data.total);
                setPage(response.data.page);
                setPageCount(response.data.pageCount);
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to fetch requests';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [filters]);


    // Fetch requests when filters change
    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Socket.io integration for real-time updates
    useEffect(() => {
        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

        // Import socket.io-client dynamically
        import('socket.io-client').then(({ io }) => {
            const socket = io(SOCKET_URL, {
                auth: {
                    token: localStorage.getItem('authToken')
                }
            });

            // Listen for request updates
            socket.on('request_updated', (data) => {
                console.log('Request updated:', data);
                fetchRequests(); // Refresh the list
            });

            socket.on('request_rescheduled', (data) => {
                console.log('Request rescheduled:', data);
                fetchRequests(); // Refresh the list
            });

            socket.on('requests_bulk_updated', (data) => {
                console.log('Bulk update:', data);
                fetchRequests(); // Refresh the list
            });

            return () => {
                socket.disconnect();
            };
        }).catch(err => {
            console.warn('Socket.io not available:', err);
        });
    }, [fetchRequests]);

    const setFilters = useCallback((newFilters: Partial<RequestFilters>) => {
        setFiltersState((prev) => ({
            ...prev,
            ...newFilters,
            // Reset to page 1 when filters change (except when explicitly setting page)
            page: newFilters.page !== undefined ? newFilters.page : 1,
        }));
    }, []);

    const refreshRequests = useCallback(async () => {
        await fetchRequests();
    }, [fetchRequests]);

    const approveRequest = useCallback(async (
        id: string,
        data?: { scheduledStart?: string; scheduledEnd?: string; note?: string }
    ): Promise<boolean> => {
        try {
            const response = await requestsApi.approveRequest(id, data);

            if (response.success) {
                toast.success('Appointment approved successfully');
                await refreshRequests();
                return true;
            }

            toast.error('Failed to approve appointment');
            return false;
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve appointment');
            return false;
        }
    }, [refreshRequests]);

    const rejectRequest = useCallback(async (
        id: string,
        reason: string
    ): Promise<boolean> => {
        try {
            const response = await requestsApi.rejectRequest(id, reason);

            if (response.success) {
                toast.success('Appointment rejected successfully');
                await refreshRequests();
                return true;
            }

            toast.error('Failed to reject appointment');
            return false;
        } catch (err: any) {
            toast.error(err.message || 'Failed to reject appointment');
            return false;
        }
    }, [refreshRequests]);

    const rescheduleRequest = useCallback(async (
        id: string,
        data: { newPreferredDate: string; newPreferredTime: string; reason: string }
    ): Promise<boolean> => {
        try {
            const response = await requestsApi.rescheduleRequest(id, data);

            if (response.success) {
                toast.success('Appointment rescheduled successfully');
                await refreshRequests();
                return true;
            }

            toast.error('Failed to reschedule appointment');
            return false;
        } catch (err: any) {
            toast.error(err.message || 'Failed to reschedule appointment');
            return false;
        }
    }, [refreshRequests]);

    const bulkApprove = useCallback(async (
        ids: string[],
        scheduledStart?: string
    ): Promise<boolean> => {
        // Optimistic update
        const previousRequests = [...requests];
        const previousTotal = total;

        // Optimistically remove approved requests from the list (assuming they move to 'APPROVED' status)
        // If we want to keep them but show as approved, we would map and update status.
        // Assuming the list might filter out approved ones or just show them.
        // Let's update status to APPROVED for better UX if they are still in view
        setRequests(prev => prev.map(req =>
            ids.includes(req._id) ? { ...req, status: 'APPROVED' } : req
        ));

        try {
            const response = await requestsApi.bulkAction('APPROVE', ids, undefined, scheduledStart);

            if (response.success) {
                const { successCount, failCount } = response.data;

                if (failCount > 0) {
                    toast.warning(`Approved ${successCount} appointments. ${failCount} failed.`);
                    // Better to refresh to get true state if some failed
                    await refreshRequests();
                } else {
                    toast.success(`Successfully approved ${successCount} appointments`);
                }

                // If we didn't refresh above, we might want to refresh now or just leave optimistic state if accurate
                // A refresh is safer to ensure consistency with backend
                if (failCount === 0) {
                    await refreshRequests();
                }
                return true;
            }

            // Revert on failure response
            setRequests(previousRequests);
            setTotal(previousTotal);
            toast.error('Bulk approve failed');
            return false;
        } catch (err: any) {
            // Revert on error
            setRequests(previousRequests);
            setTotal(previousTotal);
            toast.error(err.message || 'Bulk approve failed');
            return false;
        }
    }, [requests, total, refreshRequests]);

    const bulkReject = useCallback(async (
        ids: string[],
        reason: string
    ): Promise<boolean> => {
        // Optimistic update
        const previousRequests = [...requests];
        const previousTotal = total;

        // Optimistically update status to REJECTED
        setRequests(prev => prev.map(req =>
            ids.includes(req._id) ? { ...req, status: 'REJECTED' } : req
        ));

        try {
            const response = await requestsApi.bulkAction('REJECT', ids, reason);

            if (response.success) {
                const { successCount, failCount } = response.data;

                if (failCount > 0) {
                    toast.warning(`Rejected ${successCount} appointments. ${failCount} failed.`);
                    await refreshRequests();
                } else {
                    toast.success(`Successfully rejected ${successCount} appointments`);
                }

                if (failCount === 0) {
                    await refreshRequests();
                }
                return true;
            }

            // Revert
            setRequests(previousRequests);
            setTotal(previousTotal);
            toast.error('Bulk reject failed');
            return false;
        } catch (err: any) {
            // Revert
            setRequests(previousRequests);
            setTotal(previousTotal);
            toast.error(err.message || 'Bulk reject failed');
            return false;
        }
    }, [requests, total, refreshRequests]);

    const exportRequests = useCallback(async () => {
        try {
            const response = await requestsApi.exportRequests(filters);
            if (response.success && response.data) {
                const blob = new Blob([response.data.csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'requests.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success('CSV exported');
            } else {
                toast.error('Failed to export CSV');
            }
        } catch (e) {
            console.error('Export error:', e);
            toast.error('Export error');
        }
    }, [filters]);

    return {
        requests,
        total,
        page,
        pageCount,
        loading,
        error,
        filters,
        setFilters,
        refreshRequests,
        approveRequest,
        rejectRequest,
        rescheduleRequest,
        bulkApprove,
        bulkReject,
        exportRequests,
    };
}

export default useRequests;
