import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/input/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/card";
import { Input } from "@/components/input/input";
import { Label } from "@/components/input/label";
import { Textarea } from "@/components/input/textarea";
import { DatePickerInput } from "@/components/input/DatePickerInput";
import { TimePickerSelect } from "@/components/input/TimePickerSelect";
import { BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const bookForOtherSchema = z.object({
    visitorName: z.string().min(2, "Enter visitor's full name").max(120, "Name too long"),
    visitorPhone: z.string().regex(/^\d{10}$/, "Enter a 10-digit mobile number"),
    visitorEmail: z.string().email("Enter a valid email"),
    purpose: z.string().min(10, "Purpose must be at least 10 characters").max(500, "Purpose must be at most 500 characters"),
    notes: z.string().max(500, "Notes must be at most 500 characters").optional(),
});

type BookForOtherValues = z.infer<typeof bookForOtherSchema>;

const FormError: React.FC<{ msg?: string }> = ({ msg }) => (
    msg ? <p className="text-xs text-red-600 mt-1">{msg}</p> : null
);

interface BookAppointmentForOtherProps {
    user: any;
    bookAppointment: (data: any) => Promise<void>;
    isBooking: boolean;
    setActiveTab: (tab: string) => void;
}

export const BookAppointmentForOther: React.FC<BookAppointmentForOtherProps> = ({
    user,
    bookAppointment,
    isBooking,
    setActiveTab,
}) => {
    const { toast } = useToast();
    const [bookDate, setBookDate] = useState<Date>();
    const [bookTime, setBookTime] = useState<string>();

    const form = useForm<BookForOtherValues>({
        resolver: zodResolver(bookForOtherSchema),
        defaultValues: {
            visitorName: "",
            visitorPhone: "",
            visitorEmail: "",
            purpose: "",
            notes: "",
        }
    });

    const onSubmit = async (values: BookForOtherValues) => {
        try {
            console.log('Book for other submission started');

            // Validate date and time
            if (!bookDate || !bookTime) {
                const errors: any = {};
                if (!bookDate) errors.date = 'Please select a date';
                if (!bookTime) errors.time = 'Please select a time';

                Object.keys(errors).forEach(key => {
                    form.setError(key as any, { message: errors[key] });
                });
                toast({ title: "Validation Error", description: "Please select both date and time.", variant: "destructive" });
                return;
            }

            const formattedDate = `${bookDate.getFullYear()}-${String(bookDate.getMonth() + 1).padStart(2, '0')}-${String(bookDate.getDate()).padStart(2, '0')}`;

            const appointmentData = {
                requesterType: user?.role === 'admin' ? 'ADMIN' : 'STAFF',
                bookingFor: 'someone_else',
                visitorName: values.visitorName,
                visitorEmail: values.visitorEmail,
                visitorPhone: values.visitorPhone,
                personToMeet: user?.name || user?.fullName || user?.username,
                purpose: values.purpose,
                preferredDate: formattedDate,
                preferredTime: bookTime,
                attendees: [],
                additionalAttendees: 0,
                notes: values.notes || '',
            };

            console.log('Sending appointment data:', appointmentData);
            await bookAppointment(appointmentData);

            toast({ title: "Success", description: "Appointment request submitted successfully!" });

            // Reset form
            form.reset();
            setBookDate(undefined);
            setBookTime(undefined);

            // Switch to appointments tab
            setActiveTab('appointments');
        } catch (error: any) {
            console.error('Book appointment error:', error);
            const message = error?.message || 'Unable to submit appointment. Please try again.';
            toast({ title: "Error", description: message, variant: "destructive" });
        }
    };

    const handleSubmit = form.handleSubmit(onSubmit);

    return (
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            <div className="space-y-1 md:space-y-2">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Book Appointment (For Someone Else)</h2>
                <p className="text-sm md:text-base text-muted-foreground">Book an appointment on behalf of a visitor.</p>
            </div>

            <Card className="border-muted/40 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <BookOpen className="h-5 w-5 text-primary" /> Visitor Information
                    </CardTitle>
                    <CardDescription className="text-sm">Fill in the visitor's details below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                        <div className="space-y-5 md:space-y-6">
                            {/* Visitor Details */}
                            <div className="space-y-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Visitor Details</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Full Name</Label>
                                        <Input
                                            placeholder="Enter visitor's full name"
                                            className="h-10"
                                            {...form.register("visitorName")}
                                        />
                                        <FormError msg={form.formState.errors.visitorName?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Phone Number</Label>
                                        <Input
                                            placeholder="10-digit mobile number"
                                            className="h-10"
                                            {...form.register("visitorPhone")}
                                        />
                                        <FormError msg={form.formState.errors.visitorPhone?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Email Address</Label>
                                        <Input
                                            type="email"
                                            placeholder="Enter visitor's email"
                                            className="h-10"
                                            {...form.register("visitorEmail")}
                                        />
                                        <FormError msg={form.formState.errors.visitorEmail?.message} />
                                    </div>
                                </div>
                            </div>

                            {/* Your Information */}
                            <div className="space-y-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Your Information (Booking Staff)</p>
                                <div className="bg-muted/30 p-3 md:p-4 rounded-lg space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Your Name</Label>
                                        <Input
                                            className="h-10 bg-background"
                                            value={user?.name || user?.fullName || user?.username || ""}
                                            readOnly
                                            disabled
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Email</Label>
                                        <Input
                                            type="email"
                                            className="h-10 bg-background"
                                            value={user?.email || ""}
                                            readOnly
                                            disabled
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">The visitor will meet with you</p>
                                </div>
                            </div>

                            {/* Appointment Details */}
                            <div className="space-y-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Appointment Details</p>
                                <div className="space-y-3 md:space-y-4">
                                    {/* Purpose of Visit */}
                                    <div className="space-y-2 md:space-y-3">
                                        <Label className="text-sm font-medium">Purpose of Visit</Label>
                                        <Textarea
                                            placeholder="Briefly describe the purpose of the visit..."
                                            className="w-full resize-none min-h-[80px]"
                                            rows={3}
                                            {...form.register("purpose")}
                                        />
                                        <FormError msg={form.formState.errors.purpose?.message} />
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-2 md:space-y-3">
                                        <Label className="text-sm font-medium">Notes (Optional)</Label>
                                        <Textarea
                                            placeholder="Any additional notes..."
                                            className="w-full resize-none min-h-[60px]"
                                            rows={2}
                                            {...form.register("notes")}
                                        />
                                        <FormError msg={form.formState.errors.notes?.message} />
                                    </div>

                                    {/* Date and Time */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                                        <div className="space-y-2 md:space-y-3">
                                            <Label className="text-sm font-medium">Preferred Date</Label>
                                            <DatePickerInput
                                                value={bookDate}
                                                onChange={(date) => {
                                                    setBookDate(date);
                                                }}
                                                disablePastDates
                                                disableSundays
                                                placeholder="Select date"
                                            />
                                        </div>
                                        <div className="space-y-2 md:space-y-3">
                                            <Label className="text-sm font-medium">Preferred Time</Label>
                                            <TimePickerSelect
                                                value={bookTime}
                                                onChange={(time) => {
                                                    setBookTime(time);
                                                }}
                                                placeholder="Select time"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full lg:w-auto"
                                disabled={isBooking}
                            >
                                {isBooking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
                                <span className="hidden sm:inline">{isBooking ? "Submitting Request..." : "Submit Appointment Request"}</span>
                                <span className="sm:hidden">{isBooking ? "Submitting..." : "Submit Request"}</span>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
