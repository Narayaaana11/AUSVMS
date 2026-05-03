import React, { useState, useMemo } from "react";
import {
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    User,
    Mail,
    Phone,
    Eye,
    Copy,
    Check,
    Search,
    AlertCircle,
} from "lucide-react";
import { Visitor } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/card";
import { Badge } from "@/components/data-display/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/layout-ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/overlay/dialog";
import { Button } from "@/components/input/button";
import { Input } from "@/components/input/input";
import { cn } from "@/lib/utils";

/**
 * Empty state component for when no appointments are available
 */
const EmptyState: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle: string;
}> = ({ icon: Icon, title, subtitle }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 p-3 bg-muted rounded-full">
            <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
);

/**
 * Stats card component for displaying appointment statistics
 */
const StatsCard: React.FC<{
    label: string;
    value: number;
    variant?: "default" | "warning" | "success" | "destructive";
}> = ({ label, value, variant = "default" }) => {
    const variants = {
        default: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
        warning: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
        success: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        destructive: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };

    return (
        <div className={cn("border rounded-lg p-3 md:p-4", variants[variant])}>
            <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">{label}</p>
            <p className="text-2xl md:text-3xl font-bold mt-2">{value}</p>
        </div>
    );
};

/**
 * Detail field component for displaying appointment details
 */
const DetailField: React.FC<{
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
}> = ({ label, value, icon: Icon }) => (
    <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-2 text-sm text-foreground">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <span className="break-words">{value}</span>
        </div>
    </div>
);

interface MyAppointmentsProps {
    appointments: Visitor[];
}

/**
 * Utility function to get status badge with icon
 */
const getStatusBadge = (status: string) => {
    const statusConfig = {
        pending: {
            icon: Clock,
            label: "Pending",
            className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400",
        },
        approved: {
            icon: CheckCircle,
            label: "Approved",
            className: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
        },
        denied: {
            icon: XCircle,
            label: "Denied",
            className: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
        },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <Badge className={cn("gap-1.5 px-2.5 py-1 text-xs", config.className)}>
            <Icon className="h-3.5 w-3.5" />
            {config.label}
        </Badge>
    );
};

const AppointmentTable: React.FC<{ appointments: Visitor[]; onView: (appointment: Visitor) => void }> = ({ appointments, onView }) => {
    const { toast } = useToast();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyOTP = (otp: string, id: string) => {
        navigator.clipboard.writeText(otp);
        setCopiedId(id);
        toast({ title: "Success", description: "OTP copied to clipboard!" });
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-4">
            {appointments.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title="No appointments"
                    subtitle="Your appointments will appear here"
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {appointments.map((appointment) => (
                        <div
                            key={appointment.id}
                            className="border border-border/40 rounded-lg p-4 md:p-6 hover:bg-muted/30 transition-colors"
                        >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                {/* Left Section */}
                                <div className="flex-1 space-y-3 min-w-0">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="text-base md:text-lg font-semibold text-foreground truncate">{appointment.name}</h3>
                                            <p className="text-xs text-muted-foreground font-mono">ID: {appointment.id}</p>
                                        </div>
                                        {getStatusBadge(appointment.status)}
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{appointment.dateRequested} at {appointment.timeRequested}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <User className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{appointment.meetingPerson || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{appointment.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{appointment.phone}</span>
                                        </div>
                                    </div>

                                    {/* Purpose */}
                                    <div className="bg-muted/40 p-3 rounded-lg">
                                        <p className="text-xs font-medium text-muted-foreground uppercase">Purpose</p>
                                        <p className="text-sm text-foreground mt-1 line-clamp-2">{appointment.purpose}</p>
                                    </div>

                                    {/* OTP Section (if approved) */}
                                    {appointment.otp && appointment.status === "approved" && (
                                        <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-green-700 dark:text-green-400">Entry OTP</p>
                                                <p className="text-lg font-mono font-bold text-green-700 dark:text-green-400 mt-1">{appointment.otp}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyOTP(appointment.otp!, appointment.id)}
                                                className={cn(
                                                    "transition-colors",
                                                    copiedId === appointment.id && "bg-green-500/20"
                                                )}
                                            >
                                                {copiedId === appointment.id ? (
                                                    <>
                                                        <Check className="h-3.5 w-3.5 mr-1" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3.5 w-3.5 mr-1" />
                                                        Copy
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                <div className="flex w-full md:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full md:w-auto"
                                        onClick={() => onView(appointment)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const MyAppointments: React.FC<MyAppointmentsProps> = ({ appointments }) => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "denied">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAppointment, setSelectedAppointment] = useState<Visitor | null>(null);

    // Filter appointments based on active tab and search query
    const filteredAppointments = useMemo(() => {
        let filtered = appointments;

        // Filter by status
        if (activeTab !== "all") {
            filtered = filtered.filter((apt) => apt.status === activeTab);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (apt) =>
                    apt.name.toLowerCase().includes(query) ||
                    apt.email.toLowerCase().includes(query) ||
                    apt.phone.toLowerCase().includes(query) ||
                    apt.purpose.toLowerCase().includes(query) ||
                    apt.id.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [appointments, activeTab, searchQuery]);

    // Calculate stats
    const stats = useMemo(
        () => ({
            total: appointments.length,
            pending: appointments.filter((a) => a.status === "pending").length,
            approved: appointments.filter((a) => a.status === "approved").length,
            denied: appointments.filter((a) => a.status === "denied").length,
        }),
        [appointments]
    );

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <StatsCard label="Total" value={stats.total} variant="default" />
                <StatsCard label="Pending" value={stats.pending} variant="warning" />
                <StatsCard label="Approved" value={stats.approved} variant="success" />
                <StatsCard label="Denied" value={stats.denied} variant="destructive" />
            </div>

            {/* Search and Filter */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, phone, purpose, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                        <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                        <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
                        <TabsTrigger value="denied">Denied ({stats.denied})</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Appointments Table/Cards */}
            <AppointmentTable appointments={filteredAppointments} onView={setSelectedAppointment} />

            {/* Detail Dialog */}
            {selectedAppointment && (
                <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Appointment Details</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Header with Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground">{selectedAppointment.name}</h3>
                                    <p className="text-sm text-muted-foreground font-mono">{selectedAppointment.id}</p>
                                </div>
                                {getStatusBadge(selectedAppointment.status)}
                            </div>

                            {/* Two Column Layout */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    <DetailField label="Name" value={selectedAppointment.name} />
                                    <DetailField label="Email" value={selectedAppointment.email} icon={Mail} />
                                    <DetailField label="Phone" value={selectedAppointment.phone} icon={Phone} />
                                    <DetailField
                                        label="Meeting With"
                                        value={selectedAppointment.meetingPerson || "—"}
                                        icon={User}
                                    />
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    <DetailField label="Date" value={selectedAppointment.dateRequested} icon={Calendar} />
                                    <DetailField label="Time" value={selectedAppointment.timeRequested} />
                                    <DetailField
                                        label="Booking Type"
                                        value={selectedAppointment.bookingFor === "myself" ? "Staff-to-Staff" : "Visitor"}
                                    />
                                    {selectedAppointment.department && (
                                        <DetailField label="Department" value={selectedAppointment.department} />
                                    )}
                                </div>
                            </div>

                            {/* Purpose Section */}
                            <div className="bg-muted/40 p-4 rounded-lg space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Purpose</p>
                                <p className="text-sm text-foreground">{selectedAppointment.purpose}</p>
                            </div>

                            {/* Notes Section */}
                            {selectedAppointment.notes && (
                                <div className="bg-muted/40 p-4 rounded-lg space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Notes</p>
                                    <p className="text-sm text-foreground">{selectedAppointment.notes}</p>
                                </div>
                            )}

                            {/* OTP Section */}
                            {selectedAppointment.otp && selectedAppointment.status === "approved" && (
                                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-2">
                                        Entry OTP
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-3xl font-mono font-bold text-green-700 dark:text-green-400">
                                            {selectedAppointment.otp}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                navigator.clipboard.writeText(selectedAppointment.otp!);
                                                toast({
                                                    title: "Success",
                                                    description: "OTP copied to clipboard!",
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy OTP
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Denial Reason */}
                            {selectedAppointment.denialReason && selectedAppointment.status === "denied" && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase mb-2 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Denial Reason
                                    </p>
                                    <p className="text-sm text-red-700 dark:text-red-400">{selectedAppointment.denialReason}</p>
                                </div>
                            )}

                            {/* Timestamps */}
                            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                                <p>Requested: {new Date(selectedAppointment.dateCreated || "").toLocaleString()}</p>
                                {selectedAppointment.approvalDate && (
                                    <p>Approved: {new Date(selectedAppointment.approvalDate).toLocaleString()}</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default MyAppointments;
