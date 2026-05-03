import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/layout-ui/tabs";
import { BookOpen, User } from "lucide-react";
import { BookAppointmentForMyself } from "./BookAppointmentForMyself";
import { BookAppointmentForOther } from "./BookAppointmentForOther";


interface BookAppointmentProps {
    user: any;
    bookAppointment: (data: any) => Promise<void>;
    isBooking: boolean;
    setActiveTab: (tab: string) => void;
    departments: Array<{ _id: string; name: string; code?: string }>;
    staffList: Array<{ _id: string; name: string; email?: string; department?: string }>;
}

export const BookAppointment: React.FC<BookAppointmentProps> = ({
    user,
    bookAppointment,
    isBooking,
    setActiveTab,
    departments,
    staffList,
}) => {
    const [activeMode, setActiveMode] = useState<'myself' | 'other'>('myself');

    // Only show tabs if user is staff or admin
    if (user?.role !== 'staff' && user?.role !== 'admin') {
        return <BookAppointmentForOther user={user} bookAppointment={bookAppointment} isBooking={isBooking} setActiveTab={setActiveTab} />;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
            <div className="space-y-1 md:space-y-2">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Book Appointment</h2>
                <p className="text-sm md:text-base text-muted-foreground">Select booking type and fill in the details below.</p>
            </div>

            <Card className="border-muted/40 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <BookOpen className="h-5 w-5 text-primary" /> Booking Mode
                    </CardTitle>
                    <CardDescription className="text-sm">Choose who you are booking the appointment for.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeMode} onValueChange={(val) => setActiveMode(val as 'myself' | 'other')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="myself" className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline">For Myself</span>
                                <span className="sm:hidden">Myself</span>
                            </TabsTrigger>
                            <TabsTrigger value="other" className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline">For Someone Else</span>
                                <span className="sm:hidden">Other</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="myself" className="pt-6">
                            <BookAppointmentForMyself
                                user={user}
                                bookAppointment={bookAppointment}
                                isBooking={isBooking}
                                setActiveTab={setActiveTab}
                            />
                        </TabsContent>

                        <TabsContent value="other" className="pt-6">
                            <BookAppointmentForOther
                                user={user}
                                bookAppointment={bookAppointment}
                                isBooking={isBooking}
                                setActiveTab={setActiveTab}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default BookAppointment;
