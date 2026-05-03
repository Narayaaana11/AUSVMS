import React, { useEffect, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/overlay/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/layout-ui/command";
import { BookOpen, Loader2, User, Check, ChevronsUpDown } from "lucide-react";
import { apiService } from "@/services/apiService";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const bookForMyselfSchema = z.object({
    personToMeet: z.string().min(1, "Please select a person to meet"),
    purpose: z.string().min(10, "Purpose must be at least 10 characters").max(500, "Purpose must be at most 500 characters"),
    notes: z.string().max(500, "Notes must be at most 500 characters").optional(),
});

type BookForMyselfValues = z.infer<typeof bookForMyselfSchema>;

const FormError: React.FC<{ msg?: string }> = ({ msg }) => (
    msg ? <p className="text-xs text-red-600 mt-1">{msg}</p> : null
);

interface BookAppointmentForMyselfProps {
    user: any;
    bookAppointment: (data: any) => Promise<void>;
    isBooking: boolean;
    setActiveTab: (tab: string) => void;
}

export const BookAppointmentForMyself: React.FC<BookAppointmentForMyselfProps> = ({
    user,
    bookAppointment,
    isBooking,
    setActiveTab,
}) => {
    const { toast } = useToast();
    const [bookDate, setBookDate] = useState<Date>();
    const [bookTime, setBookTime] = useState<string>();
    const [allStaffUsers, setAllStaffUsers] = useState<Array<{ _id: string; name: string; email?: string; designation?: string; department?: string }>>([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState(true);
    const [personSearchOpen, setPersonSearchOpen] = useState(false);

    const form = useForm<BookForMyselfValues>({
        resolver: zodResolver(bookForMyselfSchema),
        defaultValues: {
            personToMeet: "",
            purpose: "",
            notes: "",
        }
    });

    // Fetch staff users on mount
    useEffect(() => {
        const fetchStaff = async () => {
            try {
                setIsLoadingStaff(true);
                const staffData = await apiService.listStaffPublic();
                setAllStaffUsers(Array.isArray(staffData) ? staffData : []);
            } catch (error) {
                console.error('Failed to fetch staff:', error);
                setAllStaffUsers([]);
            } finally {
                setIsLoadingStaff(false);
            }
        };
        fetchStaff();
    }, []);

    const onSubmit = async (values: BookForMyselfValues) => {
        try {
            console.log('Book for myself submission started');

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
                bookingFor: 'myself',
                visitorName: user?.name || user?.fullName || user?.username,
                visitorEmail: user?.email,
                visitorPhone: user?.phone,
                personToMeet: values.personToMeet,
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
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Book Appointment (For Myself)</h2>
                <p className="text-sm md:text-base text-muted-foreground">Request a meeting with college dignitaries or staff members.</p>
            </div>

            <Card className="border-muted/40 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <BookOpen className="h-5 w-5 text-primary" /> Appointment Details
                    </CardTitle>
                    <CardDescription className="text-sm">Fill in the form below to submit your request.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                        <div className="space-y-5 md:space-y-6">
                            {/* Your Information */}
                            <div className="space-y-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Your Information</p>
                                <div className="bg-muted/30 p-3 md:p-4 rounded-lg space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Your Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                className="h-10 pl-9 bg-background"
                                                value={user?.name || user?.fullName || user?.username || ""}
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Appointment Details */}
                            <div className="space-y-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Appointment Details</p>
                                <div className="space-y-3 md:space-y-4">
                                    {/* Person to Meet */}
                                    <div className="space-y-2 md:space-y-3">
                                        <Label className="text-sm font-medium">Person to Meet</Label>
                                        <Popover open={personSearchOpen} onOpenChange={setPersonSearchOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={personSearchOpen}
                                                    className="w-full justify-between h-10 font-normal"
                                                    disabled={isLoadingStaff}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <span className={cn(!form.watch("personToMeet") && "text-muted-foreground")}>
                                                            {form.watch("personToMeet")
                                                                ? allStaffUsers.find((s) => s.name === form.watch("personToMeet"))?.name
                                                                : isLoadingStaff ? "Loading staff..." : "Select person"}
                                                        </span>
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[600px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search staff by name..." />
                                                    <CommandList>
                                                        <CommandEmpty>No staff member found.</CommandEmpty>
                                                        <CommandGroup heading="Staff Members">
                                                            {allStaffUsers.length === 0 ? (
                                                                <div className="py-2 text-sm text-muted-foreground text-center">No staff members available</div>
                                                            ) : (
                                                                allStaffUsers.map((staff) => (
                                                                    <CommandItem
                                                                        key={staff._id}
                                                                        value={staff.name}
                                                                        onSelect={() => {
                                                                            form.setValue("personToMeet", staff.name);
                                                                            setPersonSearchOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                form.watch("personToMeet") === staff.name
                                                                                    ? "opacity-100"
                                                                                    : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{staff.name}</span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {staff.designation && staff.department ? (
                                                                                    `${staff.designation} • ${staff.department}`
                                                                                ) : (
                                                                                    staff.designation || staff.department || 'N/A'
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))
                                                            )}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormError msg={form.formState.errors.personToMeet?.message} />
                                    </div>

                                    {/* Purpose of Visit */}
                                    <div className="space-y-2 md:space-y-3">
                                        <Label className="text-sm font-medium">Purpose of Visit</Label>
                                        <Textarea
                                            placeholder="Briefly describe the purpose of your visit..."
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
                                                    const formattedDate = date ?
                                                        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                                                        : "";
                                                    form.setValue("personToMeet", form.getValues("personToMeet"));
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
