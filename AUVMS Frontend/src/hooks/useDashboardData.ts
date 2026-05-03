import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { socket } from '@/lib/socket';
import { useEffect, useState } from 'react';
import type { AppointmentLog } from '@/types/appointment';
import { toast } from 'sonner';

export const useDashboardData = () => {
    const queryClient = useQueryClient();
    const [realtimeActivity, setRealtimeActivity] = useState<AppointmentLog[]>([]);

    // 1. Fetch KPI Overview from new endpoint
    const {
        data: overview = {
            totalAppointments: 0,
            pendingRequests: 0,
            approvedToday: 0,
            deniedRequests: 0,
            insideCampus: 0,
            completedToday: 0
        },
        isLoading: overviewLoading,
        error: overviewError,
        refetch: refetchOverview
    } = useQuery({
        queryKey: ['staff-dashboard-stats'],
        queryFn: async () => {
            // Use new dedicated endpoint for staff stats
            const response = await apiService.request<{
                success: boolean;
                data: {
                    totalAppointments: number;
                    pending: number;
                    approved: number;
                    rejected: number;
                }
            }>('/appointments/dashboard/staff-stats');

            // Map response to expected format
            return {
                totalAppointments: response.data.totalAppointments,
                pendingRequests: response.data.pending,
                approvedToday: response.data.approved,
                deniedRequests: response.data.rejected,
                insideCampus: 0,
                completedToday: 0
            };
        },
        staleTime: 60000, // 1 min (relies on socket for instant updates)
        refetchOnWindowFocus: true
    });

    // 2. Fetch Recent Activity
    const {
        data: initialActivity = [],
        isLoading: activityLoading,
        error: activityError
    } = useQuery({
        queryKey: ['recent-activity'],
        queryFn: () => apiService.getRecentActivity(20),
        staleTime: 60000,
    });

    // Sync initial activity to state when loaded and CAP AT 3 ITEMS
    useEffect(() => {
        if (initialActivity.length > 0) {
            setRealtimeActivity(initialActivity.slice(0, 3));
        }
    }, [initialActivity]);

    // 3. Socket Integration
    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const handleConnect = () => {
            // Join staff-specific room
            apiService.getUserProfile().then(async () => {
                const token = localStorage.getItem('authToken');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const userId = payload.id;
                        if (userId) {
                            socket.emit('join_room', `staff:${userId}`);
                            console.log(`🔗 Joined staff room: staff:${userId}`);
                        }
                    } catch (e) {
                        console.error("Failed to parse token for socket join", e);
                    }
                }
            }).catch(err => console.error("Failed to get profile for socket join", err));
        };

        // Listen for KPI updates - refetch stats from API
        const handleKpiUpdate = (data: any) => {
            console.log('📊 Received KPI update:', data);
            refetchOverview();
        };

        // Listen for new activity - cap at 3 items
        const handleNewActivity = (activityItem: AppointmentLog) => {
            console.log('📝 Received new activity:', activityItem);
            setRealtimeActivity(prev => {
                const updated = [activityItem, ...prev];
                // CAP AT 3 ITEMS MAXIMUM
                return updated.slice(0, 3);
            });
            // Also refetch stats as numbers likely changed
            refetchOverview();
        };

        // Listen for appointment approvals (when your request is approved)
        const handleAppointmentApproved = (data: any) => {
            console.log('✅ Appointment approved:', data);
            toast.success(`Your appointment with ${data.personToMeet} has been approved!`);
            refetchOverview();
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
        };

        // Listen for general notifications
        const handleNotification = (data: any) => {
            console.log('🔔 Notification received:', data);
            if (data.type === 'success') {
                toast.success(data.message, { description: data.title });
            } else if (data.type === 'error') {
                toast.error(data.message, { description: data.title });
            } else {
                toast(data.message, { description: data.title });
            }
        };

        socket.on('connect', handleConnect);
        socket.on('kpi_update', handleKpiUpdate);
        socket.on('recent_activity', handleNewActivity);
        socket.on('appointment_approved', handleAppointmentApproved);
        socket.on('notification', handleNotification);

        // Initial join attempt if already connected
        if (socket.connected) {
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const userId = payload.id;
                    if (userId) {
                        socket.emit('join_room', `staff:${userId}`);
                        console.log(`🔗 Joined staff room on reconnect: staff:${userId}`);
                    }
                } catch (e) {
                    console.error("Failed to parse token for socket join", e);
                }
            }
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('kpi_update', handleKpiUpdate);
            socket.off('recent_activity', handleNewActivity);
            socket.off('appointment_approved', handleAppointmentApproved);
            socket.off('notification', handleNotification);
        };
    }, [queryClient, refetchOverview]);

    return {
        overview,
        activity: realtimeActivity,
        isLoading: overviewLoading || activityLoading,
        error: overviewError || activityError
    };
};
