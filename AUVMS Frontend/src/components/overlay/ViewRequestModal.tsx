import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/overlay/dialog';
import { Badge } from '@/components/data-display/badge';
import { Button } from '@/components/input/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { Separator } from '@/components/layout-ui/separator';
import { ScrollArea } from '@/components/layout-ui/scroll-area';
import {
    User,
    Mail,
    Phone,
    Calendar,
    Clock,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    UserCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { requestsApi } from '@/services/requestsApi';
import { toast } from 'sonner';

interface ViewRequestModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: string;
    onApprove?: () => void;
    onReject?: () => void;
    onReschedule?: () => void;
}

interface AppointmentDetails {
    _id: string;
    visitorName: string;
    visitorEmail: string;
    visitorPhone: string;
    staffId?: { _id: string; name: string; email: string };
    departmentId?: { _id: string; name: string };
    purpose: string;
    preferredDate: string;
    preferredTime: string;
    status: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    otpStatus?: string;
    rejectionReason?: string;
    rescheduleReason?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    logs?: Array<{
        _id: string;
        action: string;
        performedBy: { name: string; role: string };
        oldValues?: any;
        newValues?: any;
        reason?: string;
        createdAt: string;
    }>;
}

export function ViewRequestModal({
    open,
    onOpenChange,
    requestId,
    onApprove,
    onReject,
    onReschedule,
}: ViewRequestModalProps) {
    const [loading, setLoading] = useState(false);
    const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);

    useEffect(() => {
        if (open && requestId) {
            fetchAppointmentDetails();
        }
    }, [open, requestId]);

    const fetchAppointmentDetails = async () => {
        setLoading(true);
        try {
            const response = await requestsApi.getRequestById(requestId);
            if (response.success && response.data) {
                setAppointment(response.data);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch appointment details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { variant: any; icon: any }> = {
            PENDING: { variant: 'secondary', icon: AlertCircle },
            APPROVED: { variant: 'default', icon: CheckCircle },
            REJECTED: { variant: 'destructive', icon: XCircle },
            RESCHEDULED: { variant: 'outline', icon: RefreshCw },
            COMPLETED: { variant: 'default', icon: CheckCircle },
            CANCELLED: { variant: 'destructive', icon: XCircle },
        };

        const { variant, icon: Icon } = config[status] || { variant: 'secondary', icon: AlertCircle };
        return (
            <Badge variant={variant} className="gap-1">
                <Icon className="h-3 w-3" />
                {status}
            </Badge>
        );
    };

    const getActionIcon = (action: string) => {
        const icons: Record<string, any> = {
            APPROVED: CheckCircle,
            REJECTED: XCircle,
            RESCHEDULED: RefreshCw,
            BULK_APPROVED: CheckCircle,
            BULK_REJECTED: XCircle,
            OTP_REGENERATED: RefreshCw,
        };
        const Icon = icons[action] || FileText;
        return <Icon className="h-4 w-4" />;
    };

    const canPerformActions = appointment?.status === 'PENDING' || appointment?.status === 'RESCHEDULED';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Appointment Details</span>
                        {appointment && getStatusBadge(appointment.status)}
                    </DialogTitle>
                    <DialogDescription>
                        View complete appointment information and audit history
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] pr-4">
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : appointment ? (
                        <div className="space-y-6">
                            {/* Visitor Information */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Visitor Information
                                </h3>
                                <div className="grid gap-3 rounded-lg border p-4">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{appointment.visitorName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">{appointment.visitorEmail}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">{appointment.visitorPhone}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Appointment Details */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Appointment Details
                                </h3>
                                <div className="grid gap-3 rounded-lg border p-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Preferred Date</p>
                                            <p className="text-sm font-medium">
                                                {format(new Date(appointment.preferredDate), 'PPP')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Preferred Time</p>
                                            <p className="text-sm font-medium">{appointment.preferredTime}</p>
                                        </div>
                                    </div>
                                    {appointment.scheduledStart && appointment.scheduledEnd && (
                                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Scheduled Start</p>
                                                <p className="text-sm font-medium">
                                                    {format(new Date(appointment.scheduledStart), 'PPp')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Scheduled End</p>
                                                <p className="text-sm font-medium">
                                                    {format(new Date(appointment.scheduledEnd), 'PPp')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-2">
                                        <p className="text-xs text-muted-foreground">Purpose</p>
                                        <p className="text-sm">{appointment.purpose}</p>
                                    </div>
                                    {appointment.notes && (
                                        <div className="mt-2">
                                            <p className="text-xs text-muted-foreground">Notes</p>
                                            <p className="text-sm">{appointment.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Staff/Department Information */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <UserCircle className="h-4 w-4" />
                                    Staff Information
                                </h3>
                                <div className="grid gap-3 rounded-lg border p-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Meeting Person</p>
                                        <p className="text-sm font-medium">
                                            {appointment.staffId?.name || 'N/A'}
                                        </p>
                                        {appointment.staffId?.email && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {appointment.staffId.email}
                                            </p>
                                        )}
                                    </div>
                                    {appointment.departmentId && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Department</p>
                                            <p className="text-sm font-medium">{appointment.departmentId.name}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rejection/Reschedule Reason */}
                            {(appointment.rejectionReason || appointment.rescheduleReason) && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold">
                                        {appointment.rejectionReason ? 'Rejection Reason' : 'Reschedule Reason'}
                                    </h3>
                                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                                        <p className="text-sm">
                                            {appointment.rejectionReason || appointment.rescheduleReason}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Audit Logs */}
                            {appointment.logs && appointment.logs.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Activity History
                                    </h3>
                                    <div className="space-y-2">
                                        {appointment.logs.map((log) => (
                                            <div
                                                key={log._id}
                                                className="flex gap-3 rounded-lg border p-3 text-sm"
                                            >
                                                <div className="mt-0.5">{getActionIcon(log.action)}</div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(log.createdAt), 'PPp')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        by {log.performedBy.name} ({log.performedBy.role})
                                                    </p>
                                                    {log.reason && (
                                                        <p className="text-xs mt-1 text-muted-foreground italic">
                                                            "{log.reason}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                                <p>Created: {format(new Date(appointment.createdAt), 'PPp')}</p>
                                <p>Last Updated: {format(new Date(appointment.updatedAt), 'PPp')}</p>
                                <p>ID: {appointment._id}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No appointment details available
                        </div>
                    )}
                </ScrollArea>

                {/* Action Buttons */}
                {appointment && canPerformActions && (
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false);
                                onReject?.();
                            }}
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false);
                                onReschedule?.();
                            }}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reschedule
                        </Button>
                        <Button
                            onClick={() => {
                                onOpenChange(false);
                                onApprove?.();
                            }}
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default ViewRequestModal;
