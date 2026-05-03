import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sidebar as AppSidebar,
  SidebarProvider,
  SidebarHeader as AppSidebarHeader,
  SidebarContent as AppSidebarContent,
  SidebarGroup as AppSidebarGroup,
  SidebarGroupLabel as AppSidebarGroupLabel,
  SidebarMenu as AppSidebarMenu,
  SidebarMenuItem as AppSidebarMenuItem,
  SidebarMenuButton as AppSidebarMenuButton,
  SidebarMenuBadge as AppSidebarMenuBadge,
  SidebarFooter as AppSidebarFooter,
  SidebarInset as AppSidebarInset,
  SidebarRail as AppSidebarRail,
  SidebarTrigger,
} from "@/components/navigation/sidebar";
import { Button } from "@/components/input/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/data-display/card";
import { Badge } from "@/components/data-display/badge";
import { Avatar, AvatarFallback } from "@/components/data-display/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/layout-ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/overlay/dialog";
import { Input } from "@/components/input/input";
import { Label } from "@/components/input/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/input/select";
import { DatePickerInput } from "@/components/input/DatePickerInput";
import { TimePickerSelect } from "@/components/input/TimePickerSelect";
import { Textarea } from "@/components/input/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/overlay/tooltip";
import { Skeleton } from "@/components/feedback/skeleton";
import { StatsCard } from "@/components/data-display/stats-card";
import { StatusBadge } from "@/components/data-display/status-badge";
import {
  AppointmentApprovalEvent,
  NotificationEvent,
  IncomingRequestEvent,
} from "@/types/index";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/navigation/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/layout-ui/dropdown-menu";
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckCircle2,
  LogOut,
  Search,
  Settings,
  Users,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  Plus,
  User,
  Loader2,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { Visitor, MeetingPerson } from "@/types/appointment";
import { apiService } from "@/services/apiService";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";
import IncomingRequests from "@/pages/staff/IncomingRequests";
import { Dashboard } from "@/pages/staff/Dashboard";
import { BookAppointment } from "@/pages/staff/BookAppointment";
import { MyAppointments } from "@/pages/staff/MyAppointments";
import { Profile } from "@/pages/staff/Profile";

// ---- Roles ------------------------------------------------
const ROLE_NAV = {
  staff: ["dashboard", "incoming", "book", "appointments", "profile"] as const,
  admin: [
    "dashboard",
    "incoming",
    "book",
    "grant",
    "appointments",
    "profile",
  ] as const,
  security: ["dashboard", "incoming", "appointments", "profile"] as const,
} as const;

type RoleKey = keyof typeof ROLE_NAV;
type TabId = (typeof ROLE_NAV)[RoleKey][number];

// ---- Schemas ---------------------------------------------
const grantSchema = z.object({
  visitorName: z
    .string()
    .min(2, "Visitor name must be at least 2 characters")
    .max(100, "Visitor name must be at most 100 characters"),
  visitorEmail: z.string().email("Invalid email address"),
  visitorPhone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .max(15, "Phone number must be at most 15 characters")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  purpose: z
    .string()
    .min(10, "Purpose must be at least 10 characters")
    .max(500, "Purpose must be at most 500 characters"),
  meetingPerson: z
    .string()
    .min(2, "Meeting person must be at least 2 characters")
    .max(100, "Meeting person must be at most 100 characters"),
  date: z
    .string()
    .min(1, "Date is required")
    .refine((val) => !isNaN(new Date(val).getTime()), "Invalid date"),
  time: z
    .string()
    .min(1, "Time is required")
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
});

type GrantFormValues = z.infer<typeof grantSchema>;

// ---- Utility ---------------------------------------------
const useDebounced = <T,>(value: T, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
};

// ---- Component -------------------------------------------
const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role: RoleKey = (user?.role as RoleKey) || "staff";
  const { toast } = useToast();
  const { subscribe, unsubscribe } = useSocket();

  const [activeTab, setActiveTab] = useState<TabId>(
    ROLE_NAV[role][0] || "dashboard",
  );
  const [selectedAppointment, setSelectedAppointment] =
    useState<Visitor | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [denyTarget, setDenyTarget] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query);

  // Date/Time picker states for GrantAppointment (admin only)
  const [grantDate, setGrantDate] = useState<Date>();
  const [grantTime, setGrantTime] = useState<string>();

  // Notifications are fetched from backend
  const [notifications, setNotifications] = useState<
    Array<{ id: string; message: string; read: boolean; timestamp: string }>
  >([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [departments, setDepartments] = useState<
    Array<{ _id: string; name: string; code?: string }>
  >([]);
  const [staffList, setStaffList] = useState<
    Array<{ _id: string; name: string; email?: string; department?: string }>
  >([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");

  const {
    appointments,
    myAppointments,
    stats,
    pendingAppointments,
    approvedAppointments,
    deniedAppointments,
    isLoading,
    appointmentsLoading,
    statsLoading,
    approveAppointment,
    denyAppointment,
    bookAppointment,
    grantAppointment,
    isApproving,
    isDenying,
    isBooking,
    isGranting,
    refetchStats,
  } = useAppointments();

  // Fetch notifications using apiService
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        const data = await apiService.getNotifications();
        setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        toast({
          title: "Error",
          description: "Failed to load notifications.",
          variant: "destructive",
        });
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    };
    fetchNotifications();
    // Fetch departments and staff list for receiver selection
    (async () => {
      try {
        const depts = await apiService.getDepartments();
        setDepartments(depts);
      } catch {}
      try {
        const staff = await apiService.listStaffPublic();
        setStaffList(staff);
      } catch {}
    })();
  }, [toast]);

  // Socket notifications: listen for approval and generic notifications
  useEffect(() => {
    const handleApproved = (data: AppointmentApprovalEvent) => {
      toast({
        title: "Appointment Approved",
        description: `Your appointment with ${data.personToMeet} is approved.`,
      });
      // Optionally refetch stats and my appointments
      try {
        refetchStats?.();
      } catch {}
    };

    const handleNotification = (data: NotificationEvent) => {
      toast({
        title: data.title || "Notification",
        description: data.message || "",
      });
    };

    subscribe("appointment_approved", handleApproved);
    subscribe("notification", handleNotification);

    return () => {
      unsubscribe("appointment_approved", handleApproved);
      unsubscribe("notification", handleNotification);
    };
  }, [subscribe, unsubscribe, toast]);

  // Theme sync
  const [isDark, setIsDark] = useState(() => {
    return (
      document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark"
    );
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "theme") {
        setIsDark(e.newValue === "dark");
      }
    };
    window.addEventListener("storage", onStorage);
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      window.removeEventListener("storage", onStorage);
      observer.disconnect();
    };
  }, []);

  // ---- Live Updates (SSE / WS) stub -------------------------
  const mountedLive = useRef(false);
  useEffect(() => {
    if (mountedLive.current) return;
    mountedLive.current = true;
    // Implement SSE or WebSocket connection here for real-time updates
    // Example: const eventSource = new EventSource('/api/sse');
    // eventSource.onmessage = (e) => { /* update state */ };
    // return () => eventSource.close();
  }, []);

  // ---- Navigation items (role-based) ---------------------
  const navigationItems = useMemo(
    () =>
      [
        { id: "dashboard" as const, label: "Dashboard", icon: Users },
        { id: "incoming" as const, label: "Incoming Requests", icon: Clock },
        ...(ROLE_NAV[role].includes("book" as any)
          ? [{ id: "book" as const, label: "Book Appointment", icon: BookOpen }]
          : []),
        ...(ROLE_NAV[role].includes("grant" as any)
          ? [{ id: "grant" as const, label: "Grant Appointment", icon: Plus }]
          : []),
        {
          id: "appointments" as const,
          label: "My Appointments",
          icon: Calendar,
        },
        { id: "profile" as const, label: "Profile", icon: User },
      ].filter((i) => ROLE_NAV[role].includes(i.id as any)),
    [role],
  );

  // ---- Callbacks ----------------------------------------
  const handleApprove = useCallback(
    async (appointmentId: string) => {
      try {
        await approveAppointment(appointmentId);
        toast({ title: "Success", description: "Appointment approved." });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to approve appointment.",
          variant: "destructive",
        });
      }
    },
    [approveAppointment, toast],
  );

  const handleReject = useCallback(
    (appointmentId: string) => setDenyTarget(appointmentId),
    [],
  );

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
          >
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 hover:bg-green-100"
          >
            Approved
          </Badge>
        );
      case "denied":
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }, []);

  // ---- Forms (RHF + Zod) - Grant form for admin only --------------------------------
  const grantForm = useForm<GrantFormValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: {
      visitorName: "",
      visitorEmail: "",
      visitorPhone: "",
      purpose: "",
      meetingPerson: "",
      date: "",
      time: "",
    },
  });

  const onGrantSubmit = grantForm.handleSubmit(async (values) => {
    try {
      await grantAppointment({
        visitorName: values.visitorName,
        visitorEmail: values.visitorEmail,
        visitorPhone: values.visitorPhone,
        purpose: values.purpose,
        meetingPerson: values.meetingPerson,
        date: values.date,
        time: values.time,
      });
      toast({ title: "Success", description: "Appointment granted." });
      grantForm.reset();
    } catch (error) {
      console.error("Grant appointment error:", error);
      toast({
        title: "Error",
        description: "Failed to grant appointment.",
        variant: "destructive",
      });
    }
  });

  const AppointmentCard: React.FC<{ appointment: Visitor }> = ({
    appointment,
  }) => (
    <div
      className="h-full cursor-pointer"
      onClick={() => setSelectedAppointment(appointment)}
    >
      <Card className="h-full bg-gradient-to-br from-background to-muted shadow-md hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/50">
        <CardHeader className="pb-2 md:pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4">
            <div className="space-y-1 w-full sm:w-auto">
              <CardTitle className="text-base md:text-lg font-semibold break-words">
                {appointment.name}
              </CardTitle>
              <CardDescription className="text-xs opacity-70 break-all">
                Request ID: {appointment.id}
              </CardDescription>
            </div>
            <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center gap-2">
              {getStatusBadge(appointment.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 md:space-y-3">
          <div className="grid grid-cols-1 gap-2 text-xs md:text-sm">
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium truncate text-xs md:text-sm">
                {appointment.dateRequested} at {appointment.timeRequested}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
              <User className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium truncate text-xs md:text-sm">
                {appointment.meetingPerson || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
              <Eye className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium truncate text-xs md:text-sm">
                {appointment.purpose}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
              <Badge
                variant="outline"
                className="font-mono text-xs bg-background/50 truncate w-full justify-center"
              >
                {appointment.phone}
              </Badge>
            </div>
          </div>

          {appointment.otp && appointment.status === "approved" && (
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  OTP: {appointment.otp}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAppointment(appointment);
              }}
            >
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
            {appointment.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprove(appointment.id);
                  }}
                  disabled={isApproving}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">
                    {isApproving ? "Approving..." : "Approve"}
                  </span>
                  <span className="sm:hidden">App</span>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 sm:flex-none text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReject(appointment.id);
                  }}
                  disabled={isDenying}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">
                    {isDenying ? "Denying..." : "Deny"}
                  </span>
                  <span className="sm:hidden">Deny</span>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Dashboard Data Hook (Real-time)
  const {
    overview,
    activity,
    isLoading: dashboardLoading,
  } = useDashboardData();

  // Helper for role-based tab checking
  const roleIncludes = (tab: string) => ROLE_NAV[role].includes(tab as any);

  // ---- Grant Appointment Component (kept inline for admin role) ----
  const GrantAppointmentView: React.FC = () => (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="space-y-1 md:space-y-2">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
          Grant Appointment
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Create appointments for external visitors
        </p>
      </div>

      <Card className="shadow-lg border-muted/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Plus className="h-5 w-5 text-primary" /> Visitor Details
          </CardTitle>
          <CardDescription className="text-sm">
            Enter visitor information and appointment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onGrantSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Visitor Name</Label>
                <Input
                  placeholder="Enter visitor name"
                  className="w-full h-10"
                  {...grantForm.register("visitorName")}
                />
                <FormError
                  msg={grantForm.formState.errors.visitorName?.message}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Visitor Email</Label>
                <Input
                  type="email"
                  placeholder="Enter visitor email"
                  className="w-full h-10"
                  {...grantForm.register("visitorEmail")}
                />
                <FormError
                  msg={grantForm.formState.errors.visitorEmail?.message}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Visitor Phone</Label>
                <Input
                  placeholder="Enter visitor phone"
                  className="w-full h-10"
                  {...grantForm.register("visitorPhone")}
                />
                <FormError
                  msg={grantForm.formState.errors.visitorPhone?.message}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Meeting Person</Label>
                <Input
                  placeholder="Person to meet"
                  className="w-full h-10"
                  {...grantForm.register("meetingPerson")}
                />
                <FormError
                  msg={grantForm.formState.errors.meetingPerson?.message}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Purpose</Label>
              <Textarea
                placeholder="Purpose of visit"
                className="w-full resize-none"
                {...grantForm.register("purpose")}
              />
              <FormError msg={grantForm.formState.errors.purpose?.message} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date</Label>
                <DatePickerInput
                  value={grantDate}
                  onChange={(date) => {
                    setGrantDate(date);
                    grantForm.setValue(
                      "date",
                      date ? date.toISOString().split("T")[0] : "",
                    );
                  }}
                  disablePastDates
                  placeholder="Select date"
                />
                <FormError msg={grantForm.formState.errors.date?.message} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Time</Label>
                <TimePickerSelect
                  value={grantTime}
                  onChange={(time) => {
                    setGrantTime(time);
                    grantForm.setValue("time", time);
                  }}
                  placeholder="Select time"
                />
                <FormError msg={grantForm.formState.errors.time?.message} />
              </div>
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                className="w-full lg:w-auto"
                disabled={isGranting}
              >
                {isGranting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                <span className="hidden sm:inline">
                  {isGranting
                    ? "Creating Appointment..."
                    : "Create Appointment"}
                </span>
                <span className="sm:hidden">
                  {isGranting ? "Creating..." : "Create"}
                </span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <SidebarProvider>
      <div
        id="main-content"
        className={`${isDark ? "dark" : ""} min-h-screen bg-background flex w-full h-screen overflow-hidden`}
      >
        <AppSidebar
          collapsible="icon"
          className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-lg backdrop-blur supports-[backdrop-filter]:bg-sidebar/90"
        >
          <AppSidebarHeader className="px-3 py-3 md:px-4 md:py-4 border-b border-border/50">
            <div className="flex items-center gap-2 md:gap-3">
              <img
                src="/auslogo.png"
                alt="Aditya University"
                className="h-8 md:h-10 w-auto shrink-0 rounded-lg"
              />
              <div className="leading-tight">
                <p className="text-sm md:text-base font-semibold text-sidebar-foreground">
                  Staff Dashboard
                </p>
                <p className="text-xs md:text-sm text-sidebar-foreground/70">
                  Aditya University
                </p>
              </div>
            </div>
          </AppSidebarHeader>
          <AppSidebarContent className="px-2 py-2 flex-1 overflow-y-auto">
            <AppSidebarGroup>
              <AppSidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-1">
                Overview
              </AppSidebarGroupLabel>
              <AppSidebarMenu>
                {navigationItems.map((item) => (
                  <AppSidebarMenuItem key={item.id}>
                    <AppSidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => setActiveTab(item.id)}
                      className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground rounded-lg py-2"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </AppSidebarMenuButton>
                    {item.id === "incoming" &&
                      pendingAppointments.length > 0 && (
                        <AppSidebarMenuBadge className="bg-green-600/20 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full font-medium">
                          {pendingAppointments.length}
                        </AppSidebarMenuBadge>
                      )}
                  </AppSidebarMenuItem>
                ))}
              </AppSidebarMenu>
            </AppSidebarGroup>
          </AppSidebarContent>
          <AppSidebarFooter className="border-t border-border/50 p-3">
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-2 md:gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors duration-200">
                    <Avatar className="h-9 w-9 border-2 border-background shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {user?.username?.charAt(0).toUpperCase() || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-left">
                        {user?.username || "Staff Member"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate text-left">
                        {user?.role || "Staff"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("profile")}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-600 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </AppSidebarFooter>
          <AppSidebarRail />
        </AppSidebar>

        <AppSidebarInset className="flex flex-col w-full h-full overflow-hidden">
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm shrink-0">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 md:px-6 py-3 md:py-4 gap-3 lg:gap-4">
              <div className="flex items-center gap-3 md:gap-4 min-w-0 w-full lg:w-auto">
                <SidebarTrigger className="-ml-1" />
                <div className="hidden md:block space-y-1">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          Staff
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="text-sm font-medium">
                          {navigationItems.find((i) => i.id === activeTab)
                            ?.label || "Dashboard"}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                  <p className="text-sm text-muted-foreground hidden lg:block">
                    Manage appointments and requests
                  </p>
                </div>
                <div className="md:hidden flex-1">
                  <h1 className="text-lg font-semibold truncate">
                    {navigationItems.find((i) => i.id === activeTab)?.label ||
                      "Dashboard"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-4 w-full lg:w-auto lg:flex-1 lg:max-w-xl">
                <div className="relative flex-1 lg:flex-initial lg:w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search appointments..."
                    className="pl-10 h-10 text-sm bg-muted/40 border-muted focus-visible:ring-primary/20 w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <DropdownMenu
                  open={showNotifications}
                  onOpenChange={setShowNotifications}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9"
                    >
                      <Bell className="h-5 w-5" />
                      {notifications.filter((n) => !n.read).length > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-[11px] font-medium text-white">
                          {notifications.filter((n) => !n.read).length}
                        </span>
                      )}
                      <span className="sr-only">Notifications</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Notifications</p>
                        {notifications.filter((n) => !n.read).length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={async () => {
                              try {
                                await apiService.markAllNotificationsRead();
                                setNotifications((prev) =>
                                  prev.map((n) => ({ ...n, read: true })),
                                );
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description:
                                    "Failed to mark notifications as read.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Mark all read
                          </Button>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notificationsLoading ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : notifications.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className={`flex flex-col items-start p-3 ${!notification.read ? "bg-muted/50" : ""}`}
                            onClick={async () => {
                              try {
                                await apiService.markNotificationRead(
                                  notification.id,
                                );
                                setNotifications((prev) =>
                                  prev.map((n) =>
                                    n.id === notification.id
                                      ? { ...n, read: true }
                                      : n,
                                  ),
                                );
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description:
                                    "Failed to mark notification as read.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <p className="text-sm font-medium">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(
                                notification.timestamp,
                              ).toLocaleString()}
                            </p>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No notifications
                        </p>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="p-0 h-9 w-9 rounded-full"
                    >
                      <Avatar>
                        <AvatarFallback>
                          {user?.username?.charAt(0).toUpperCase() || "S"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user?.username || "Staff Member"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user?.department || "Department"}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveTab("profile")}>
                      <User className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto bg-muted/10">
            <div key={activeTab}>
              {activeTab === "dashboard" && (
                <Dashboard
                  setActiveTab={(tab) => setActiveTab(tab as TabId)}
                  refetchStats={refetchStats}
                  roleIncludes={roleIncludes}
                />
              )}
              {activeTab === "incoming" && <IncomingRequests />}
              {activeTab === "book" &&
                ROLE_NAV[role].includes("book" as const) && (
                  <BookAppointment
                    user={user}
                    bookAppointment={async (data) => {
                      try {
                        await bookAppointment(data);
                        toast({
                          title: "Success",
                          description: "Appointment booked.",
                        });
                      } catch (err: unknown) {
                        const errorMessage =
                          err instanceof Error
                            ? err.message
                            : "Failed to book appointment";
                        toast({
                          title: "Error",
                          description: errorMessage,
                          variant: "destructive",
                        });
                        console.error("Book appointment failed", err);
                      }
                    }}
                    isBooking={isBooking}
                    setActiveTab={(tab) => setActiveTab(tab as TabId)}
                    departments={departments}
                    staffList={staffList}
                  />
                )}
              {activeTab === "grant" &&
                ROLE_NAV[role].includes("grant" as any) && (
                  <GrantAppointmentView />
                )}
              {activeTab === "appointments" && (
                <MyAppointments appointments={myAppointments} />
              )}
              {activeTab === "profile" && <Profile user={user} />}
            </div>
          </main>
        </AppSidebarInset>

        {/* Appointment Details Dialog */}
        <Dialog
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedAppointment && (
              <>
                <DialogHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mr-6 sm:mr-8">
                    <div>
                      <DialogTitle className="text-lg md:text-xl">
                        {selectedAppointment.name}
                      </DialogTitle>
                      <DialogDescription className="text-xs md:text-sm break-all">
                        Request ID:{" "}
                        <span className="font-mono text-xs">
                          {selectedAppointment.id}
                        </span>
                      </DialogDescription>
                    </div>
                    <StatusBadge status={selectedAppointment.status as any} />
                  </div>
                </DialogHeader>

                <div className="grid gap-4 md:gap-6 py-4">
                  {/* Visitor Information Section */}
                  <div className="space-y-2 md:space-y-3">
                    <h4 className="text-sm font-semibold tracking-tight flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" /> Visitor Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 bg-muted/40 p-3 md:p-4 rounded-lg">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          Email
                        </span>
                        <p className="text-sm font-medium break-all">
                          {selectedAppointment.email}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          Phone
                        </span>
                        <p className="text-sm font-medium">
                          {selectedAppointment.phone}
                        </p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          Vehicle Number
                        </span>
                        <p className="text-sm font-medium">
                          {selectedAppointment.vehicleNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Details Section */}
                  <div className="space-y-2 md:space-y-3">
                    <h4 className="text-sm font-semibold tracking-tight flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" /> Appointment Info
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 bg-muted/40 p-3 md:p-4 rounded-lg">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          Requested Date
                        </span>
                        <p className="text-sm font-medium">
                          {selectedAppointment.dateRequested}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          Requested Time
                        </span>
                        <p className="text-sm font-medium">
                          {selectedAppointment.timeRequested}
                        </p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          Purpose
                        </span>
                        <p className="text-sm">{selectedAppointment.purpose}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attendees Section */}
                  {selectedAppointment.attendees &&
                    selectedAppointment.attendees.length > 0 && (
                      <div className="space-y-2 md:space-y-3">
                        <h4 className="text-sm font-semibold tracking-tight flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" /> Additional Attendees (
                          {selectedAppointment.attendees.length})
                        </h4>
                        <div className="bg-muted/40 p-2 md:p-3 rounded-lg space-y-2">
                          {selectedAppointment.attendees.map((at, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 p-2 bg-background rounded-md shadow-sm"
                            >
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {idx + 1}
                                </div>
                                <span className="text-sm font-medium truncate">
                                  {at.name}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono shrink-0">
                                {at.phone}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* OTP Section (if approved) */}
                  {selectedAppointment.otp &&
                    selectedAppointment.status === "approved" && (
                      <div className="bg-green-500/10 border border-green-500/20 p-3 md:p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            Entry Pass OTP
                          </p>
                          <p className="text-xs text-green-600/80 dark:text-green-400/80">
                            Share this with security at the gate
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-base md:text-lg font-mono tracking-[0.2em] bg-background text-green-700 border-green-200 dark:border-green-800 px-3 py-1"
                        >
                          {selectedAppointment.otp}
                        </Badge>
                      </div>
                    )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Deny Reason Dialog (single & bulk) */}
        <Dialog open={!!denyTarget} onOpenChange={() => setDenyTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">
                Deny Appointment{denyTarget === "__BULK__" ? "s" : ""}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Please provide a reason for denying{" "}
                {denyTarget === "__BULK__" ? "these requests" : "this request"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="denyReason" className="text-sm font-medium">
                  Reason
                </Label>
                <Textarea
                  id="denyReason"
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  placeholder="Enter reason for denial..."
                  className="min-h-[100px] resize-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setDenyTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  disabled={isDenying || !denyReason.trim()}
                  onClick={async () => {
                    if (!denyReason.trim()) return;
                    try {
                      if (denyTarget) {
                        await denyAppointment(denyTarget, denyReason);
                      }
                      toast({
                        title: "Success",
                        description: "Appointment denied.",
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to deny appointment.",
                        variant: "destructive",
                      });
                    } finally {
                      setDenyTarget(null);
                      setDenyReason("");
                    }
                  }}
                >
                  {isDenying ? "Denying..." : "Deny"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default StaffDashboard;

// ---- Reusable bits --------------------------------------
const Field: React.FC<{
  label: string;
  value?: React.ReactNode;
  full?: boolean;
}> = ({ label, value, full }) => (
  <div className={full ? "col-span-2" : ""}>
    <p className="text-muted-foreground">{label}</p>
    <p>{value ?? "—"}</p>
  </div>
);

const EmptyState: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}> = ({ icon: Icon, title, subtitle }) => (
  <Card className="gradient-card shadow-soft">
    <CardContent className="p-6 md:p-10 text-center">
      <Icon className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
      <p className="font-medium text-sm md:text-base">{title}</p>
      {subtitle && (
        <p className="text-muted-foreground text-xs md:text-sm mt-1">
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
);

const FormError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="text-xs text-red-600 mt-1">{msg}</p> : null;
