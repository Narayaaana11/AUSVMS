import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/overlay/dialog';
import { Badge } from '@/components/data-display/badge';
import { Button } from '@/components/input/button';
import { Clock, User } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { AppointmentLog } from '@/types/appointment';
import { format } from 'date-fns';

interface AppointmentLogsViewerProps {
    isOpen: boolean;
    onClose: () => void;
    appointmentId: string;
    visitorName?: string;
}

const getActionBadge = (action: string) => {
    const config: Record<string, { label: string; className: string }> = {
        CREATED: { label: 'Created', className: 'bg-blue-500/10 text-blue-500' },
        APPROVED: { label: 'Approved', className: 'bg-success/10 text-success' },
        REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
        RESCHEDULED: { label: 'Rescheduled', className: 'bg-warning/10 text-warning' },
        CANCELLED: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
        BULK_APPROVED: { label: 'Bulk Approved', className: 'bg-success/10 text-success' },
        BULK_REJECTED: { label: 'Bulk Rejected', className: 'bg-destructive/10 text-destructive' },
        UPDATED: { label: 'Updated', className: 'bg-primary/10 text-primary' },
        CHECKED_IN: { label: 'Checked In', className: 'bg-blue-500/10 text-blue-500' },
        CHECKED_OUT: { label: 'ChChecked Out', className: 'bg-muted text-muted-foreground' }
    };

    const { label, className } = config[action] || { label: action, className: '' };
    return <Badge className={className}>{label}</Badge>;
};

export const AppointmentLogsViewer: React.FC<AppointmentLogsViewerProps> = ({
    isOpen,
    onClose,
    appointmentId,
    visitorName
}) => {
    const [logs, setLogs] = useState<AppointmentLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const logsPerPage = 5;

    useEffect(() => {
        if (isOpen && appointmentId) {
            fetchLogs();
        }
    }, [isOpen, appointmentId]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const logsData = await apiService.getAppointmentLogs(appointmentId);
            setLogs(logsData);
        } catch (error) {
            console.error('Failed to fetch appointment logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
        } catch {
            return dateString;
        }
    };

    const renderValueChange = (log: AppointmentLog) => {
        if (log.action === 'RESCHEDULED' && log.oldValues && log.newValues) {
            const oldDate = log.oldValues.dateOfVisit ? formatDate(log.oldValues.dateOfVisit) : 'N/A';
            const oldTime = log.oldValues.timeOfVisit || 'N/A';
            const newDate = log.newValues.dateOfVisit ? formatDate(log.newValues.dateOfVisit) : 'N/A';
            const newTime = log.newValues.timeOfVisit || 'N/A';

            return (
                <div className="mt-2 text-sm bg-muted p-3 rounded-md">
                    <p><strong>Old Schedule:</strong> {oldDate} at {oldTime}</p>
                    <p className="mt-1"><strong>New Schedule:</strong> {newDate} at {newTime}</p>
                </div>
            );
        }

        if (log.oldValues && log.newValues) {
            return (
                <div className="mt-2 text-sm bg-muted p-3 rounded-md">
                    <p><strong>Status Changed:</strong> {log.oldValues.status} → {log.newValues.status}</p>
                </div>
            );
        }

        return null;
    };

    // Pagination calculations
    const totalPages = Math.ceil(logs.length / logsPerPage);
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const currentLogs = logs.slice(startIndex, endIndex);

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
    };

    // Reset to page 1 when logs change
    useEffect(() => {
        setCurrentPage(1);
    }, [logs]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Appointment Activity Log</DialogTitle>
                    <DialogDescription>
                        {visitorName ? `Audit trail for appointment with ${visitorName}` : 'Audit trail for this appointment'}
                    </DialogDescription>
                </DialogHeader>

                <div className="h-[500px] overflow-y-auto pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <p className="text-muted-foreground">Loading logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <p className="text-muted-foreground">No activity logs found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {currentLogs.map((log, index) => (
                                <div key={log._id} className="relative">
                                    {/* Timeline connector */}
                                    {index < currentLogs.length - 1 && (
                                        <div className="absolute left-4 top-12 bottom-0 w-px bg-border" />
                                    )}

                                    <div className="flex gap-4">
                                        {/* Timeline dot */}
                                        <div className="relative z-10">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Clock className="h-4 w-4 text-primary" />
                                            </div>
                                        </div>

                                        {/* Log content */}
                                        <div className="flex-1 pb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                {getActionBadge(log.action)}
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(log.createdAt)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm mt-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {log.performedBy?.name || 'System'} ({log.performedByRole})
                                                </span>
                                            </div>

                                            {log.reason && (
                                                <div className="mt-2 text-sm">
                                                    <strong>Reason:</strong> {log.reason}
                                                </div>
                                            )}

                                            {renderValueChange(log)}
                                        </div>
                                    </div>

                                    {index < currentLogs.length - 1 && <div className="border-t my-4" />}
                                </div>
                            ))}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrevPage}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleNextPage}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
