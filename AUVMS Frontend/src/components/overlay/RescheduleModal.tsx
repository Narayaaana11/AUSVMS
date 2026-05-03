import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/overlay/dialog';
import { Button } from '@/components/input/button';
import { Label } from '@/components/input/label';
import { Textarea } from '@/components/input/textarea';
import { DatePickerInput } from '@/components/input/DatePickerInput';
import { TimePickerSelect } from '@/components/input/TimePickerSelect';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface RescheduleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: string;
    currentDate?: string;
    currentTime?: string;
    onReschedule: (data: {
        newPreferredDate: string;
        newPreferredTime: string;
        reason: string;
    }) => Promise<boolean>;
}

export function RescheduleModal({
    open,
    onOpenChange,
    appointmentId,
    currentDate,
    currentTime,
    onReschedule,
}: RescheduleModalProps) {
    const [newDate, setNewDate] = useState<Date | undefined>(
        currentDate ? new Date(currentDate) : undefined
    );
    const [newTime, setNewTime] = useState(currentTime || '');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newDate) {
            toast.error('Please select a new date');
            return;
        }

        if (!newTime) {
            toast.error('Please select a new time');
            return;
        }

        if (!reason.trim()) {
            toast.error('Please provide a reason for rescheduling');
            return;
        }

        setLoading(true);

        try {
            const success = await onReschedule({
                newPreferredDate: newDate.toISOString(),
                newPreferredTime: newTime,
                reason: reason.trim(),
            });

            if (success) {
                // Reset form
                setNewDate(undefined);
                setNewTime('');
                setReason('');
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Reschedule error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setNewDate(currentDate ? new Date(currentDate) : undefined);
        setNewTime(currentTime || '');
        setReason('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Reschedule Appointment</DialogTitle>
                        <DialogDescription>
                            Select a new date and time for this appointment and provide a reason.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-date">New Date</Label>
                            <DatePickerInput
                                id="new-date"
                                date={newDate}
                                onDateChange={setNewDate}
                                placeholder="Select new date"
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="new-time">New Time</Label>
                            <TimePickerSelect
                                id="new-time"
                                value={newTime}
                                onChange={setNewTime}
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason for Rescheduling</Label>
                            <Textarea
                                id="reason"
                                placeholder="Enter reason for rescheduling..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={loading}
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reschedule
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default RescheduleModal;
