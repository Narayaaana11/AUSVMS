import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/overlay/dialog';
import { Button } from '@/components/input/button';
import { Textarea } from '@/components/input/textarea';
import { Label } from '@/components/input/label';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import { requestsApi } from '@/services/requestsApi';

interface RejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointmentId: string;
    visitorName?: string;
    onSuccess?: () => void;
    mode?: 'admin' | 'staff';
}

export const RejectAppointmentModal: React.FC<RejectModalProps> = ({
    isOpen,
    onClose,
    appointmentId,
    visitorName,
    onSuccess,
    mode = 'admin'
}) => {
    const { toast } = useToast();
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason || reason.trim() === '') {
            toast({
                title: 'Validation Error',
                description: 'Please provide a reason for rejection',
                variant: 'destructive'
            });
            return;
        }

        try {
            setLoading(true);
            if (mode === 'staff') {
                await requestsApi.rejectRequest(appointmentId, reason);
            } else {
                await apiService.rejectAppointmentWithReason(appointmentId, reason);
            }

            toast({
                title: 'Success',
                description: `Appointment rejected successfully`,
                variant: 'default'
            });

            setReason('');
            onSuccess?.();
            onClose();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to reject appointment',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setReason('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Reject Appointment
                    </DialogTitle>
                    <DialogDescription>
                        {visitorName ? `Are you sure you want to reject the appointment for ${visitorName}?` : 'Are you sure you want to reject this appointment?'}
                        <br />
                        This action cannot be undone and the visitor will be notified.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Rejection Reason <span className="text-destructive">*</span></Label>
                        <Textarea
                            id="reason"
                            placeholder="Please provide a reason for rejecting this appointment..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            rows={4}
                            className="resize-none"
                        />
                        <p className="text-sm text-muted-foreground">
                            This reason will be included in the notification email to the visitor.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={loading}
                        >
                            {loading ? 'Rejecting...' : 'Reject Appointment'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
