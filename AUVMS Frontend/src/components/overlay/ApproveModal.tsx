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
import { CheckCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ApproveModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: string;
    visitorName: string;
    onApprove: (data: {
        scheduledStart?: string;
        scheduledEnd?: string;
        note?: string;
    }) => Promise<boolean>;
}

export function ApproveModal({
    open,
    onOpenChange,
    appointmentId,
    visitorName,
    onApprove,
}: ApproveModalProps) {
    const [loading, setLoading] = useState(false);
    const [scheduledStartDate, setScheduledStartDate] = useState<Date | undefined>();
    const [scheduledStartTime, setScheduledStartTime] = useState('');
    const [scheduledEndDate, setScheduledEndDate] = useState<Date | undefined>();
    const [scheduledEndTime, setScheduledEndTime] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<{ start?: string; end?: string }>({});

    const validateDates = (): boolean => {
        const newErrors: { start?: string; end?: string } = {};

        // If either start or end is provided, both must be provided
        const hasStartDate = scheduledStartDate && scheduledStartTime;
        const hasEndDate = scheduledEndDate && scheduledEndTime;

        if ((hasStartDate && !hasEndDate) || (!hasStartDate && hasEndDate)) {
            newErrors.start = 'Both start and end times must be provided';
            newErrors.end = 'Both start and end times must be provided';
            setErrors(newErrors);
            return false;
        }

        // If both provided, validate
        if (hasStartDate && hasEndDate) {
            const start = new Date(scheduledStartDate);
            const [startHours, startMinutes] = scheduledStartTime.split(':');
            start.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

            const end = new Date(scheduledEndDate);
            const [endHours, endMinutes] = scheduledEndTime.split(':');
            end.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

            // Check if start is after end
            if (start >= end) {
                newErrors.end = 'End time must be after start time';
                setErrors(newErrors);
                return false;
            }

            // Check if start is in the past
            if (start < new Date()) {
                newErrors.start = 'Cannot schedule appointment in the past';
                setErrors(newErrors);
                return false;
            }
        }

        setErrors({});
        return true;
    };

    const handleApprove = async () => {
        if (!validateDates()) {
            return;
        }

        setLoading(true);
        try {
            const data: {
                scheduledStart?: string;
                scheduledEnd?: string;
                note?: string;
            } = {};

            // Only include scheduling if both start and end are provided
            if (scheduledStartDate && scheduledStartTime && scheduledEndDate && scheduledEndTime) {
                const start = new Date(scheduledStartDate);
                const [startHours, startMinutes] = scheduledStartTime.split(':');
                start.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
                data.scheduledStart = start.toISOString();

                const end = new Date(scheduledEndDate);
                const [endHours, endMinutes] = scheduledEndTime.split(':');
                end.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
                data.scheduledEnd = end.toISOString();
            }

            if (note.trim()) {
                data.note = note.trim();
            }

            const success = await onApprove(data);
            if (success) {
                resetForm();
                onOpenChange(false);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve appointment');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setScheduledStartDate(undefined);
        setScheduledStartTime('');
        setScheduledEndDate(undefined);
        setScheduledEndTime('');
        setNote('');
        setErrors({});
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Approve Appointment
                    </DialogTitle>
                    <DialogDescription>
                        Approve the appointment request from <strong>{visitorName}</strong>.
                        Optionally set scheduled start and end times.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Scheduled Start */}
                    <div className="grid gap-3">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Scheduled Start (Optional)
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <DatePickerInput
                                    date={scheduledStartDate}
                                    onDateChange={setScheduledStartDate}
                                    placeholder="Select date"
                                    className={errors.start ? 'border-destructive' : ''}
                                />
                            </div>
                            <div>
                                <TimePickerSelect
                                    value={scheduledStartTime}
                                    onChange={setScheduledStartTime}
                                    placeholder="Select time"
                                    className={errors.start ? 'border-destructive' : ''}
                                />
                            </div>
                        </div>
                        {errors.start && (
                            <p className="text-xs text-destructive">{errors.start}</p>
                        )}
                    </div>

                    {/* Scheduled End */}
                    <div className="grid gap-3">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Scheduled End (Optional)
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <DatePickerInput
                                    date={scheduledEndDate}
                                    onDateChange={setScheduledEndDate}
                                    placeholder="Select date"
                                    className={errors.end ? 'border-destructive' : ''}
                                />
                            </div>
                            <div>
                                <TimePickerSelect
                                    value={scheduledEndTime}
                                    onChange={setScheduledEndTime}
                                    placeholder="Select time"
                                    className={errors.end ? 'border-destructive' : ''}
                                />
                            </div>
                        </div>
                        {errors.end && (
                            <p className="text-xs text-destructive">{errors.end}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="grid gap-2">
                        <Label htmlFor="approve-note">Notes (Optional)</Label>
                        <Textarea
                            id="approve-note"
                            placeholder="Add any notes or instructions..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Info Message */}
                    <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        💡 <strong>Tip:</strong> Scheduling is optional. You can approve now and schedule later.
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleApprove} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve Appointment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ApproveModal;
