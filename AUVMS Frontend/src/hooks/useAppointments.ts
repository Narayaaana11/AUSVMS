import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import type { Visitor, StaffAppointment, AppointmentRequest, BookAppointmentPayload } from '@/types/appointment';
import { useEffect, useState } from 'react';
import { useLocalStorage } from './use-local-storage';
import { socket } from '@/lib/socket';

export const useAppointments = () => {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Array<{ id: string, message: string, read: boolean, timestamp: string }>>([]);
  const [filterSettings, setFilterSettings] = useLocalStorage('staff-dashboard-filters', {
    dateRange: { start: '', end: '' },
    status: 'all',
    searchTerm: '',
    sortBy: 'date',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
    pageSize: 10
  });

  // Fetch staff appointments with filters
  const {
    data: appointmentsData = { appointments: [], totalCount: 0 },
    isLoading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments
  } = useQuery({
    queryKey: ['staff-appointments', filterSettings],
    queryFn: () => apiService.getStaffAppointments(filterSettings as any),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  const appointments = appointmentsData.appointments || [];
  const totalAppointments = appointmentsData.totalCount || 0;

  // Fetch today's visitors
  const {
    data: todayVisitors = [],
    isLoading: todayVisitorsLoading,
    refetch: refetchTodayVisitors
  } = useQuery({
    queryKey: ['today-visitors'],
    queryFn: apiService.getTodayVisitors,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch staff's own appointment requests
  const {
    data: myAppointments = [],
    isLoading: myAppointmentsLoading,
    error: myAppointmentsError,
    refetch: refetchMyAppointments
  } = useQuery({
    queryKey: ['my-appointment-requests'],
    queryFn: apiService.getMyAppointmentRequests,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Fetch appointment statistics
  const {
    data: stats = { total: 0, pending: 0, approved: 0, denied: 0, todayTotal: 0, todayCompleted: 0 },
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['appointment-stats'],
    queryFn: apiService.getAppointmentStats,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 10000 // Retry every 10 seconds to ensure consistency
  });

  // Fetch notifications
  const {
    data: fetchedNotifications = [],
    isLoading: notificationsLoading,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ['staff-notifications'],
    queryFn: apiService.getNotifications,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Fetch user profile
  const {
    data: userProfile,
    isLoading: profileLoading,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ['user-profile'],
    queryFn: apiService.getUserProfile,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Approve appointment mutation with optimistic updates
  const approveMutation = useMutation({
    mutationFn: (appointmentId) => apiService.approveAppointment(appointmentId),
    onMutate: async (appointmentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['staff-appointments'] });

      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData(['staff-appointments', filterSettings]);

      // Optimistically update to the new value
      queryClient.setQueryData(['staff-appointments', filterSettings], (old: any) => {
        const updatedAppointments = old.appointments.map((appointment: Visitor) =>
          appointment.id === appointmentId
            ? { ...appointment, status: 'approved', approvedAt: new Date().toISOString() }
            : appointment
        );
        return { ...old, appointments: updatedAppointments };
      });

      // Return a context object with the snapshotted value
      return { previousAppointments };
    },
    onError: (err, appointmentId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousAppointments) {
        queryClient.setQueryData(['staff-appointments', filterSettings], context.previousAppointments);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['today-visitors'] });
    }
  });

  // Deny appointment mutation with optimistic updates
  const denyMutation = useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason?: string }) =>
      apiService.denyAppointment(appointmentId, reason),
    onMutate: async ({ appointmentId }) => {
      await queryClient.cancelQueries({ queryKey: ['staff-appointments'] });

      const previousAppointments = queryClient.getQueryData(['staff-appointments', filterSettings]);

      queryClient.setQueryData(['staff-appointments', filterSettings], (old: any) => {
        const updatedAppointments = old.appointments.map((appointment: Visitor) =>
          appointment.id === appointmentId
            ? { ...appointment, status: 'denied', deniedAt: new Date().toISOString() }
            : appointment
        );
        return { ...old, appointments: updatedAppointments };
      });

      return { previousAppointments };
    },
    onError: (err, variables, context) => {
      if (context?.previousAppointments) {
        queryClient.setQueryData(['staff-appointments', filterSettings], context.previousAppointments);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    }
  });

  // Reschedule appointment mutation
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: (data) => apiService.rescheduleAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['today-visitors'] });
    }
  });

  // Book appointment mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: (data) => apiService.bookAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    }
  });

  // Grant appointment mutation
  const grantAppointmentMutation = useMutation({
    mutationFn: (data) => apiService.grantAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['today-visitors'] });
    }
  });

  // Add visitor note mutation
  const addVisitorNoteMutation = useMutation({
    mutationFn: apiService.addVisitorNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-visitors'] });
    }
  });

  // Update visitor status mutation
  const updateVisitorStatusMutation = useMutation({
    mutationFn: apiService.updateVisitorStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-visitors'] });
    }
  });

  // Mark notification as read mutation
  const markNotificationReadMutation = useMutation({
    mutationFn: apiService.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
    }
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: apiService.updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: apiService.changePassword
  });

  // Socket integration for real-time updates
  useEffect(() => {
    // Set up socket event listeners for real-time updates
    socket.on('appointment_created', () => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
    });

    socket.on('appointment_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['today-visitors'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    });

    socket.on('visitor_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['today-visitors'] });
    });

    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
    });

    return () => {
      socket.off('appointment_created');
      socket.off('appointment_updated');
      socket.off('visitor_status_changed');
      socket.off('new_notification');
    };
  }, [queryClient]);

  // Update notifications state when fetched notifications change
  useEffect(() => {
    if (fetchedNotifications.length > 0) {
      setNotifications(fetchedNotifications);
    }
  }, [fetchedNotifications]);

  // Helper functions
  const approveAppointment = async (appointmentId: string) => {
    return approveMutation.mutateAsync(appointmentId);
  };

  const denyAppointment = (appointmentId: string, reason?: string) => {
    denyMutation.mutate({ appointmentId, reason });
  };

  const rescheduleAppointment = (appointmentId: string, newDate: string, newTime: string) => {
    rescheduleAppointmentMutation.mutate({ appointmentId, newDate, newTime });
  };

  const bookAppointment = (data: BookAppointmentPayload) => {
    return bookAppointmentMutation.mutateAsync(data);
  };

  const grantAppointment = (data: {
    visitorName: string;
    visitorEmail: string;
    visitorPhone: string;
    purpose: string;
    meetingPerson: string;
    date: string;
    time: string;
  }) => {
    grantAppointmentMutation.mutate(data);
  };

  // Filtered data
  const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
  const approvedAppointments = appointments.filter(apt => apt.status === 'approved');
  const deniedAppointments = appointments.filter(apt => apt.status === 'denied');

  return {
    // Data
    appointments,
    myAppointments,
    stats,
    pendingAppointments,
    approvedAppointments,
    deniedAppointments,

    // Loading states
    appointmentsLoading,
    myAppointmentsLoading,
    statsLoading,
    isLoading: appointmentsLoading || myAppointmentsLoading || statsLoading,

    // Error states
    appointmentsError,
    myAppointmentsError,
    statsError,

    // Mutations
    approveAppointment,
    denyAppointment,
    bookAppointment,
    grantAppointment,

    // Mutation states
    isApproving: approveMutation.isPending,
    isDenying: denyMutation.isPending,
    isBooking: bookAppointmentMutation.isPending,
    isGranting: grantAppointmentMutation.isPending,

    // Refetch functions
    refetchAppointments,
    refetchMyAppointments,
    refetchStats: () => queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })
  };
};
