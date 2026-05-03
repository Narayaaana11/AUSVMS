import React, { useEffect, useMemo, useState } from 'react';
import { AppointmentManagement } from '@/components/admin/AppointmentManagement';
import { useSocket } from '@/hooks/useSocket';
import { apiService } from '@/services/apiService';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

/**
 * IncomingRequests Component
 * 
 * Displays incoming appointment requests for the logged-in staff member.
 * - Shows only appointments where staffId matches logged-in user
 * - Real-time updates via WebSocket events: 'request_updated', 'request_rescheduled'
 * - Backend-driven stats and data
 * - No dummy data
 */
export function IncomingRequests() {
  const { toast } = useToast();
  const { subscribe, unsubscribe } = useSocket();
  const queryClient = useQueryClient();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  /**
   * WebSocket listeners for incoming request updates
   * Automatically refreshes data when:
   * - Appointment is approved/rejected
   * - Appointment is rescheduled
   * Backend emits 'request_updated' and 'request_rescheduled' events
   */
  useEffect(() => {
    const handleIncomingRequest = (data: any) => {
      toast({
        title: 'New Appointment Request',
        description: `${data.visitorName} wants to meet with you`,
      });

      // Trigger re-fetch of data
      setRefetchTrigger(prev => prev + 1);

      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['incoming-requests'] });
    };
    const handleRequestUpdated = (data: any) => {
      // Toast notification for real-time feedback
      const statusMessages: Record<string, string> = {
        'APPROVED': 'Appointment approved',
        'REJECTED': 'Appointment rejected',
      };

      if (statusMessages[data.status]) {
        toast({
          title: 'Update',
          description: statusMessages[data.status],
        });
      }

      // Trigger re-fetch of data
      setRefetchTrigger(prev => prev + 1);

      // Invalidate React Query cache to refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['incoming-requests'] });
    };

    const handleRequestRescheduled = (data: any) => {
      toast({
        title: 'Update',
        description: 'Appointment rescheduled',
      });

      // Trigger re-fetch of data
      setRefetchTrigger(prev => prev + 1);

      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['incoming-requests'] });
    };

    // Subscribe to WebSocket events
    subscribe('incoming_request', handleIncomingRequest);
    subscribe('request_updated', handleRequestUpdated);
    subscribe('request_rescheduled', handleRequestRescheduled);

    return () => {
      unsubscribe('incoming_request', handleIncomingRequest);
      unsubscribe('request_updated', handleRequestUpdated);
      unsubscribe('request_rescheduled', handleRequestRescheduled);
    };
  }, [subscribe, unsubscribe, toast, queryClient]);

  return (
    <div className="container mx-auto px-0 sm:px-4 py-4 md:py-6">
      <AppointmentManagement
        mode="staff"
        title="Incoming Requests"
        defaultFilters={{
          status: 'all'
        }}
        refetchTrigger={refetchTrigger}
      />
    </div>
  );
}

export default IncomingRequests;