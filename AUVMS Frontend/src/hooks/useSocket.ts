import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// TODO: Move this to environment variable
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Event types
export type SocketEvent =
    | 'new_appointment'
    | 'appointment_created'
    | 'appointment_status_updated'
    | 'visitor_checked_in'
    | 'visitor_checked_out'
    | 'request_updated'
    | 'request_rescheduled'
    | 'incoming_request_updated'
    | 'incoming_request'
    | 'appointment_approved'
    | 'notification';

export interface AppointmentEvent {
    id: string;
    visitorName: string;
    personToMeet: string;
    purpose: string;
    status: string;
    dateOfVisit?: Date;
    timeOfVisit?: string;
    createdAt?: Date;
    updatedAt?: Date;
    oldStatus?: string;
}

export interface VisitorEvent {
    id: string;
    visitorName: string;
    personToMeet: string;
    purpose: string;
    status: string;
    checkInAt?: Date;
    checkOutAt?: Date;
}

type EventCallback = (data: AppointmentEvent | VisitorEvent) => void;

/**
 * Custom React hook for Socket.io real-time updates
 * 
 * Usage:
 * ```tsx
 * const { subscribe, unsubscribe, isConnected } = useSocket();
 * 
 * useEffect(() => {
 *   const handleNewAppointment = (data) => {
 *     console.log('New appointment:', data);
 *   };
 *   
 *   subscribe('new_appointment', handleNewAppointment);
 *   
 *   return () => {
 *     unsubscribe('new_appointment', handleNewAppointment);
 *   };
 * }, [subscribe, unsubscribe]);
 * ```
 * 
 * TODO: Implement JWT authentication for socket connections
 * TODO: Implement role-based room subscriptions (admin, staff, guard)
 */
export const useSocket = () => {
    const socketRef = useRef<Socket | null>(null);
    const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());

    useEffect(() => {
        // Initialize socket connection only once
        if (!socketRef.current) {
            socketRef.current = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                // TODO: Add JWT token for authentication
                // auth: {
                //   token: localStorage.getItem('token')
                // }
            });

            socketRef.current.on('connect', () => {
                // TODO: Join role-based rooms after authentication
                // socketRef.current?.emit('join_room', { role: user.role });
            });

            socketRef.current.on('disconnect', (reason) => {
                // Socket disconnected
            });

            socketRef.current.on('connect_error', (error) => {
                // Connection error occurred
            });
        }

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    /**
     * Subscribe to a socket event
     * @param event - Event name to listen to
     * @param callback - Function to call when event is received
     */
    const subscribe = useCallback((event: SocketEvent, callback: EventCallback) => {
        if (!socketRef.current) {
            return;
        }

        // Track listeners to prevent duplicates
        if (!listenersRef.current.has(event)) {
            listenersRef.current.set(event, new Set());
        }

        const listeners = listenersRef.current.get(event)!;

        // Only add listener if not already subscribed
        if (!listeners.has(callback)) {
            listeners.add(callback);
            socketRef.current.on(event, callback);
        }
    }, []);

    /**
     * Unsubscribe from a socket event
     * @param event - Event name to stop listening to
     * @param callback - Function to remove
     */
    const unsubscribe = useCallback((event: SocketEvent, callback: EventCallback) => {
        if (!socketRef.current) return;

        const listeners = listenersRef.current.get(event);
        if (listeners && listeners.has(callback)) {
            listeners.delete(callback);
            socketRef.current.off(event, callback);
        }
    }, []);

    /**
     * Check if socket is connected
     */
    const isConnected = socketRef.current?.connected ?? false;

    return {
        subscribe,
        unsubscribe,
        isConnected,
        socket: socketRef.current
    };
};

export default useSocket;
