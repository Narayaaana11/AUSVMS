import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/types/appointment';
import axios from 'axios';

interface UseNotificationsOptions {
  isMock?: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  unreadCount: number;
}

// Mock data for development
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Appointment Request',
    message: 'John Doe has requested an appointment for tomorrow at 2:00 PM',
    type: 'info',
    read: false,
    timestamp: new Date().toISOString(),
    appointmentId: 'appt-001'
  },
  {
    id: '2',
    title: 'Appointment Approved',
    message: 'Your appointment with Dr. Smith has been approved for Friday',
    type: 'success',
    read: true,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    appointmentId: 'appt-002'
  },
  {
    id: '3',
    title: 'System Maintenance',
    message: 'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM',
    type: 'warning',
    read: false,
    timestamp: new Date(Date.now() - 7200000).toISOString()
  }
];

export const useNotifications = ({ isMock = false }: UseNotificationsOptions = {}): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (isMock) {
      setIsLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(mockNotifications);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setNotifications(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isMock]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (isMock) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/notifications/${notificationId}/read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to mark notification as read');
    }
  }, [isMock]);

  const markAllAsRead = useCallback(async () => {
    if (isMock) {
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch('/api/notifications/mark-all-read', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Failed to mark all notifications as read');
    }
  }, [isMock]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(notif => !notif.read).length;

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    markAsRead,
    markAllAsRead,
    isLoading,
    error,
    refreshNotifications,
    unreadCount
  };
};
