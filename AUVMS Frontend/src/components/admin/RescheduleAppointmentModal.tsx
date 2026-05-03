import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/overlay/dialog';
import { Button } from '@/components/input/button';
import { Input } from '@/components/input/input';
import { Textarea } from '@/components/input/textarea';
import { Label } from '@/components/input/label';
import { DatePickerInput } from '@/components/input/DatePickerInput';
import { TimePickerSelect } from '@/components/input/TimePickerSelect';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import { requestsApi } from '@/services/requestsApi';

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointmentId: string;
    currentDate?: string;
    currentTime?: string;
    visitorName?: string;
    onSuccess?: () => void;
    mode?: 'admin' | 'staff';
}

export const RescheduleAppointmentModal: React.FC<RescheduleModalProps> = ({
    isOpen,
    onClose,
    appointmentId,
    currentDate,
    currentTime,
    visitorName,
    onSuccess,
    mode = 'admin'
}) => {
    const { toast } = useToast();
    const [newDate, setNewDate] = useState<Date>();
    const [newTime, setNewTime] = useState<string>('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!newDate || !newTime) {
            toast({
                title: 'Validation Error',
                description: 'Please select a new date and time',
                variant: 'destructive'
            });
            return;
        }

        if (!reason || reason.trim() === '') {
            toast({
                title: 'Validation Error',
                description: 'Please provide a reason for rescheduling',
                variant: 'destructive'
            });
            return;
        }

        // Check if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (newDate < today) {
            toast({
                title: 'Invalid Date',
                description: 'Cannot reschedule to a past date',
                variant: 'destructive'
            });
            return;
        }

        try {
            setLoading(true);
            const data = {
                newPreferredDate: newDate.toISOString().split('T')[0],
                newPreferredTime: newTime,
                reason: reason
            };

            if (mode === 'staff') {
                await requestsApi.rescheduleRequest(appointmentId, data);
            } else {
                await apiService.rescheduleAppointmentWithReason(appointmentId, data);
            }

            toast({
                title: 'Success',
                description: `Appointment rescheduled successfully`,
                variant: 'default'
            });

            // Reset form
            setNewDate(undefined);
            setNewTime('');
            setReason('');

            onSuccess?.();
            onClose();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to reschedule appointment',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setNewDate(undefined);
        setNewTime('');
        setReason('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reschedule Appointment</DialogTitle>
                    <DialogDescription>
                        {visitorName && `Rescheduling appointment for ${visitorName}`}
                        {currentDate && currentTime && (
                            <span className="block mt-2 text-sm font-medium">
                                Current Schedule: {currentDate} at {currentTime}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="newDate">New Date</Label>
                        <DatePickerInput
                            value={newDate}
                            onChange={setNewDate}
                            disablePastDates
                            placeholder="Select new date"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newTime">New Time</Label>
                        <TimePickerSelect
                            value={newTime}
                            onChange={setNewTime}
                            placeholder="Select new time"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Rescheduling <span className="text-destructive">*</span></Label>
                        <Textarea
                            id="reason"
                            placeholder="Please provide a reason for rescheduling this appointment..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            rows={3}
                            className="resize-none"
                        />
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
                            disabled={loading}
                        >
                            {loading ? 'Rescheduling...' : 'Reschedule'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
