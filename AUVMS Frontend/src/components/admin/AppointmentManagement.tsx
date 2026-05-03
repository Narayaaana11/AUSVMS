import { useState, useEffect } from "react";
import { Button } from "@/components/input/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/data-display/card";
import { Badge } from "@/components/data-display/badge";
import { Checkbox } from "@/components/input/checkbox";
import { Input } from "@/components/input/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/input/select";
import { CheckCircle, XCircle, History, RefreshCw, Key, Eye, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { requestsApi } from "@/services/requestsApi";
import { RescheduleAppointmentModal } from "./RescheduleAppointmentModal";
import { RejectAppointmentModal } from "./RejectAppointmentModal";
import { AppointmentLogsViewer } from "./AppointmentLogsViewer";
import { useSocket } from "@/hooks/useSocket";

interface Appointment {
  id: string;
  visitorName: string;
  visitorId?: string;
  department?: string;
  meetingPerson: string;
  date: string;
  time: string;
  status: "pending" | "approved" | "rejected" | "rescheduled" | "completed" | "cancelled" | "checked-in" | "checked-out" | "expected";
  purpose: string;
  createdAt: string;
  phone?: string;
  email?: string;
  otpStatus?: "OK" | "EXPIRED" | "LOCKED" | "N/A" | "SENT" | "NOT_SENT";
  otpAttempts?: number;
  checkInTime?: string;
  checkOutTime?: string;
  otpSent?: boolean;
  otpExpiresAt?: string;
  rejectionReason?: string;
  rescheduleReason?: string;
  notes?: string;
  attendees?: Array<{ name: string; phone: string }>;
}

interface AppointmentManagementProps {
  mode?: 'admin' | 'staff';
  title?: string;
  defaultFilters?: {
    status?: string;
  };
  refetchTrigger?: number;
}

export const AppointmentManagement = ({ mode = 'admin', title = "Appointment Management", defaultFilters, refetchTrigger }: AppointmentManagementProps) => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>(defaultFilters?.status || "all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterOtpStatus, setFilterOtpStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    appointmentId: string;
    currentDate?: string;
    currentTime?: string;
    visitorName?: string;
  }>({ isOpen: false, appointmentId: "" });

  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    appointmentId: string;
    visitorName?: string;
  }>({ isOpen: false, appointmentId: "" });

  const [logsModal, setLogsModal] = useState<{
    isOpen: boolean;
    appointmentId: string;
    visitorName?: string;
  }>({ isOpen: false, appointmentId: "" });

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
  }>({ isOpen: false, appointment: null });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    rescheduled: 0,
  });

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let appointmentsList: Appointment[] = [];
      let pages = 1;

      if (mode === 'admin') {
        const response = await apiService.getAppointmentsAdmin({
          page,
          pageSize,
          status: filterStatus !== "all" ? filterStatus : undefined,
          department: filterDepartment !== "all" ? filterDepartment : undefined,
          otpStatus: filterOtpStatus !== "all" ? filterOtpStatus : undefined,
          search: searchTerm || undefined,
        });

        if (response.success && response.data) {
          appointmentsList = response.data.map((v: any) => {
            // Calculate OTP Status (Admin logic)
            let otpStatus: Appointment['otpStatus'] = 'N/A';
            if (['approved', 'expected', 'checked-in', 'rescheduled'].includes(v.status)) {
              const now = new Date();
              const expiresAt = v.otpExpiresAt ? new Date(v.otpExpiresAt) : null;
              const attempts = v.otpAttempts || 0;
              const maxAttempts = v.maxOtpAttempts || 5;

              if (!v.email) otpStatus = 'NOT_SENT';
              else if (attempts >= maxAttempts) otpStatus = 'LOCKED';
              else if (expiresAt && now > expiresAt) otpStatus = 'EXPIRED';
              else if (expiresAt) otpStatus = 'SENT';
              else otpStatus = 'OK';
            } else if (['checked-out', 'completed'].includes(v.status)) {
              otpStatus = 'USED';
            }

            return {
              id: v._id || v.id,
              visitorId: v.visitorPassId || (v._id || v.id).slice(-8).toUpperCase(),
              visitorName: v.name || v.visitorName,
              department: v.department || "General",
              meetingPerson: v.meetingPerson || v.personToMeet,
              date: v.dateOfVisit
                ? new Date(v.dateOfVisit).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : (v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'),
              time:
                v.timeOfVisit ||
                (v.createdAt ? new Date(v.createdAt).toLocaleTimeString('en-US', {
                  hour: "2-digit",
                  minute: "2-digit",
                }) : 'N/A'),
              status: v.status === "denied" ? "rejected" : v.status,
              purpose: v.purpose || v.purposeOfVisit,
              createdAt: (v.submittedAt || v.createdAt) ? new Date(v.submittedAt || v.createdAt).toLocaleString('en-US') : 'N/A',
              phone: v.contactNumber || v.phone,
              email: v.email,
              otpStatus,
              otpAttempts: v.otpAttempts,
              otpExpiresAt: v.otpExpiresAt,
              checkInTime: v.checkInAt ? new Date(v.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
              checkOutTime: v.checkOutAt ? new Date(v.checkOutAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
              rejectionReason: v.rejectionReason,
              rescheduleReason: v.rescheduleReason,
              notes: v.notes,
              attendees: v.attendees || [],
            };
          });
          pages = response.pagination?.totalPages || 1;
        }
      } else {
        // Staff Mode - fetch using standardized apiService
        const response = await apiService.getStaffAppointments({
          page,
          pageSize,
          status: filterStatus !== "all" ? (filterStatus as any) : undefined,
          searchTerm: searchTerm || undefined,
          sortBy: 'date',
          sortOrder: 'desc'
        });

        // Map Visitor[] to Appointment[]
        appointmentsList = response.appointments.map((v: any) => {
          // Calculate OTP Status for staff view
          let otpStatus: Appointment['otpStatus'] = 'N/A';
          if (['approved', 'expected', 'checked-in', 'rescheduled'].includes(v.status)) {
            const now = new Date();
            const expiresAt = v.otpExpiresAt ? new Date(v.otpExpiresAt) : null;
            const attempts = v.otpAttempts || 0;
            const maxAttempts = v.maxOtpAttempts || 5;

            if (!v.email) otpStatus = 'NOT_SENT';
            else if (attempts >= maxAttempts) otpStatus = 'LOCKED';
            else if (expiresAt && now > expiresAt) otpStatus = 'EXPIRED';
            else if (expiresAt) otpStatus = 'SENT';
            else otpStatus = 'OK';
          } else if (['checked-out', 'completed'].includes(v.status)) {
            otpStatus = 'USED';
          }

          return {
            id: v.id || v._id,
            visitorId: v.visitorPassId || (v.id || v._id).slice(-8).toUpperCase(),
            visitorName: v.name,
            department: v.department || "General",
            meetingPerson: v.meetingPerson || v.personToMeet || "Me",
            date: v.dateOfVisit
              ? new Date(v.dateOfVisit).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
              : (v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'),
            time: v.timeOfVisit ||
              (v.createdAt ? new Date(v.createdAt).toLocaleTimeString('en-US', {
                hour: "2-digit",
                minute: "2-digit",
              }) : 'N/A'),
            status: (v.status === 'denied' ? 'rejected' : v.status) as Appointment['status'],
            purpose: v.purposeOfVisit || v.purpose,
            createdAt: v.createdAt ? new Date(v.createdAt).toLocaleString('en-US') : 'N/A',
            phone: v.contactNumber || v.phone,
            email: v.email,
            otpStatus,
            otpAttempts: v.otpAttempts || 0,
            otpExpiresAt: v.otpExpiresAt,
            checkInTime: v.checkInAt ? new Date(v.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
            checkOutTime: v.checkOutAt ? new Date(v.checkOutAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
            rejectionReason: v.rejectionReason,
            rescheduleReason: v.rescheduleReason,
            notes: v.notes,
            attendees: v.attendees || [],
          };
        });

        pages = Math.ceil(response.totalCount / pageSize) || 1;
      }

      setAppointments(appointmentsList);
      setTotalPages(pages);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (mode === 'admin') {
        const statsData = await apiService.getEnhancedAppointmentStats();
        setStats(statsData);
      } else {
        // Staff stats - Use requestsApi for better stats
        try {
          const statsRes = await requestsApi.getRequestStats();
          if (statsRes.success && statsRes.data) {
            setStats({
              total: statsRes.data.totalRequests || 0,
              pending: statsRes.data.pendingRequests || 0,
              approved: statsRes.data.approvedRequests || 0,
              rejected: statsRes.data.rejectedRequests || 0,
              rescheduled: statsRes.data.rescheduledRequests || 0,
              completed: statsRes.data.completedRequests || 0
            });
          }
        } catch (e) {
          // Fallback to basic stats if requests API fails
          const statsRes = await apiService.getAppointmentStats();
          if (statsRes) {
            setStats({
              total: statsRes.total || 0,
              pending: statsRes.pending || 0,
              approved: statsRes.approved || 0,
              rejected: statsRes.denied || 0,
              rescheduled: 0,
              completed: statsRes.todayCompleted || 0
            });
          }
        }
      }
    } catch (error) {
      // Stats fetch failed
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [page, pageSize, filterStatus, filterDepartment, filterOtpStatus, searchTerm, mode, refetchTrigger]);

  useEffect(() => {
    fetchStats();
  }, [appointments, mode]); // Refresh stats when list changes

  // WebSocket listener for real-time appointments
  const { subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    const handleNewAppointment = (data: any) => {
      // Add toast notification
      toast({
        title: "New Appointment",
        description: `${data.visitorName} has booked an appointment`,
      });

      // Refresh appointments immediately
      fetchAppointments();
      fetchStats();
    };

    const handleAppointmentCreated = (data: any) => {

      // Add toast notification
      toast({
        title: "Appointment Created & Approved",
        description: `${data.visitorName} appointment is auto-approved`,
      });

      // Refresh appointments immediately
      fetchAppointments();
      fetchStats();
    };

    // Subscribe to both event types
    subscribe('new_appointment', handleNewAppointment);
    subscribe('appointment_created', handleAppointmentCreated);

    return () => {
      unsubscribe('new_appointment', handleNewAppointment);
      unsubscribe('appointment_created', handleAppointmentCreated);
    };
  }, [subscribe, unsubscribe, toast, mode]);

  // Details Modal State
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
  }>({ isOpen: false, appointment: null });

  const filteredAppointments = appointments;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAppointments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAppointments.map((apt) => apt.id));
    }
  };

  const getStatusBadge = (status: Appointment["status"]) => {
    const statusConfig: Record<string, { bg: string, text: string, label: string }> = {
      created: { bg: "bg-muted", text: "text-muted-foreground", label: "Created" },
      pending: { bg: "bg-warning/10", text: "text-warning", label: "Pending" },
      approved: { bg: "bg-success/10", text: "text-success", label: "Approved" },
      expected: { bg: "bg-success/10", text: "text-success", label: "Expected" },
      rejected: { bg: "bg-destructive/10", text: "text-destructive", label: "Rejected" },
      rescheduled: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Rescheduled" },
      completed: { bg: "bg-primary/10", text: "text-primary", label: "Completed" },
      cancelled: { bg: "bg-muted", text: "text-muted-foreground", label: "Cancelled" },
      "checked-in": { bg: "bg-purple-500/10", text: "text-purple-500", label: "Checked In" },
      "checked-out": { bg: "bg-gray-500/10", text: "text-gray-500", label: "Checked Out" },
    };
    const config = statusConfig[status.toUpperCase()] || statusConfig[status] || statusConfig.pending; // Handle potential case diff
    return (
      <Badge className={`${config.bg} ${config.text}`}>{config.label}</Badge>
    );
  };

  const getOtpBadge = (status: Appointment["otpStatus"]) => {
    if (!status || status === 'N/A') return <span className="text-muted-foreground text-xs">N/A</span>;
    if (status === 'OK') return <Badge variant="outline" className="border-green-500 text-green-500 text-xs">Valid</Badge>;
    if (status === 'SENT') return <Badge variant="outline" className="border-blue-500 text-blue-500 text-xs">Sent</Badge>;
    if (status === 'NOT_SENT') return <Badge variant="outline" className="border-gray-400 text-gray-600 text-xs">Not Sent</Badge>;
    if (status === 'EXPIRED') return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    if (status === 'LOCKED') return <Badge variant="destructive" className="bg-red-800 text-xs">Locked</Badge>;
    if (status === 'USED') return <Badge variant="outline" className="border-emerald-500 text-emerald-500 text-xs">Used</Badge>;
    return <span className="text-muted-foreground text-xs">-</span>;
  };

  const handleApprove = async (id: string) => {
    try {
      // Universal approve
      await apiService.approveAppointment(id);
      toast({ title: "Approved", description: "Appointment approved successfully" });
      fetchAppointments();
      fetchStats();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to approve", variant: "destructive" });
    }
  };

  const handleRegenerateOTP = async (id: string) => {
    if (!confirm("Regenerate OTP for this visitor? Previously generated OTPs will become invalid.")) return;
    try {
      // Universal regenerate
      await apiService.regenerateOTP(id);
      // Success handling
      toast({ title: "Success", description: "OTP Regenerated" });
      fetchAppointments();
    } catch (e: any) {
      toast({ title: "Error", description: "Failed to regenerate OTP", variant: "destructive" });
    }
  };

  const handleResendOTP = async (id: string, visitorName: string) => {
    try {
      const result = await apiService.resendOTP(id);
      const sentToDetails = [];
      if (result.sentTo.email) sentToDetails.push(`Email: ${result.sentTo.email}`);
      if (result.sentTo.phone) sentToDetails.push(`Phone: ${result.sentTo.phone}`);

      toast({
        title: "OTP Resent Successfully",
        description: `OTP sent to ${visitorName}${sentToDetails.length ? '\n' + sentToDetails.join('\n') : ''}`
      });
      fetchAppointments();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to resend OTP",
        variant: "destructive"
      });
    }
  };

  const handleBulkApprove = async () => {
    console.log('🔘 Approve button clicked');
    console.log('📋 Selected IDs:', selectedIds);
    console.log('👤 Mode:', mode);

    if (selectedIds.length === 0) {
      console.log('❌ No appointments selected');
      return;
    }

    try {
      console.log(`🚀 Starting approval for ${selectedIds.length} appointment(s)...`);

      if (mode === 'staff') {
        // Staff: use individual approve endpoint for each appointment
        console.log('🔐 Using staff mode - calling individual approve endpoints');
        const approvalPromises = selectedIds.map(id => {
          console.log(`📨 Approving appointment: ${id}`);
          return apiService.approveAppointment(id)
            .then(result => {
              console.log(`✅ Approval successful for ${id}:`, result);
              return result;
            })
            .catch(err => {
              console.error(`❌ Approval failed for ${id}:`, err);
              throw err;
            });
        });
        await Promise.all(approvalPromises);
      } else {
        // Admin: use bulk action endpoint
        console.log('👨‍💼 Using admin mode - calling bulk action endpoint');
        await apiService.bulkActionAppointments({ action: "APPROVE", appointmentIds: selectedIds });
        console.log('✅ Bulk approve completed');
      }

      toast({ title: "Bulk Approve", description: "Actions completed" });
      setSelectedIds([]);
      fetchAppointments();
      fetchStats();
    } catch (e: any) {
      console.error('💥 Approve error:', e);
      toast({ title: "Error", description: e.message || "Bulk approve failed", variant: "destructive" });
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const reason = prompt("Enter rejection reason for all selected appointments:");
    if (!reason) return;
    try {
      if (mode === 'staff') {
        // Staff: use individual reject endpoint for each appointment
        await Promise.all(selectedIds.map(id => apiService.denyAppointment(id, reason)));
      } else {
        // Admin: use bulk action endpoint
        await apiService.bulkActionAppointments({ action: "REJECT", appointmentIds: selectedIds, reason });
      }
      toast({ title: "Bulk Reject", description: "Actions completed" });
      setSelectedIds([]);
      fetchAppointments();
      fetchStats();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Bulk reject failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Bulk Actions */}
      <div className="flex items-start justify-between flex-wrap gap-2 md:gap-4">
        <div className="space-y-0.5">
          <h3 className="text-base md:text-lg font-semibold">{title}</h3>
          <p className="text-xs md:text-sm text-muted-foreground leading-tight">{mode === 'admin' ? "View and manage all visitor appointments" : "Manage your incoming visitor requests"}</p>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-8" onClick={handleBulkApprove}>
              <CheckCircle className="h-4 w-4 mr-2" /> Approve ({selectedIds.length})
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleBulkReject}>
              <XCircle className="h-4 w-4 mr-2" /> Reject ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        <Card className="gradient-card"><CardContent className="p-3 sm:p-3.5 text-center space-y-1"><p className="text-lg sm:text-xl font-bold text-primary leading-none">{stats.total}</p><p className="text-xs sm:text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card className="gradient-card"><CardContent className="p-3 sm:p-3.5 text-center space-y-1"><p className="text-lg sm:text-xl font-bold text-warning leading-none">{stats.pending}</p><p className="text-xs sm:text-sm text-muted-foreground">Pending</p></CardContent></Card>
        <Card className="gradient-card"><CardContent className="p-3 sm:p-3.5 text-center space-y-1"><p className="text-lg sm:text-xl font-bold text-success leading-none">{stats.approved}</p><p className="text-xs sm:text-sm text-muted-foreground">Approved</p></CardContent></Card>
        <Card className="gradient-card"><CardContent className="p-3 sm:p-3.5 text-center space-y-1"><p className="text-lg sm:text-xl font-bold text-destructive leading-none">{stats.rejected}</p><p className="text-xs sm:text-sm text-muted-foreground">Rejected</p></CardContent></Card>
        <Card className="gradient-card"><CardContent className="p-3 sm:p-3.5 text-center space-y-1"><p className="text-lg sm:text-xl font-bold text-blue-500 leading-none">{stats.rescheduled || 0}</p><p className="text-xs sm:text-sm text-muted-foreground">Rescheduled</p></CardContent></Card>
        <Card className="gradient-card"><CardContent className="p-3 sm:p-3.5 text-center space-y-1"><p className="text-lg sm:text-xl font-bold text-primary leading-none">{stats.completed || 0}</p><p className="text-xs sm:text-sm text-muted-foreground">Completed</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="gradient-card shadow-soft">
        <CardContent className="p-4 md:p-6">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 items-center">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="min-w-[160px] sm:min-w-[200px] h-9"
            />
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[130px] sm:w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="checked-in">Checked In</SelectItem>
                <SelectItem value="checked-out">Checked Out</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
              </SelectContent>
            </Select>
            {mode === 'admin' && (
              <Select value={filterDepartment} onValueChange={(v) => { setFilterDepartment(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] sm:w-[150px] h-9"><SelectValue placeholder="Dept" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="CSE">CSE</SelectItem>
                  <SelectItem value="ECE">ECE</SelectItem>
                  <SelectItem value="EEE">EEE</SelectItem>
                  <SelectItem value="MECH">MECH</SelectItem>
                  <SelectItem value="CIVIL">CIVIL</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* {mode === 'admin' && (
              <Select value={filterOtpStatus} onValueChange={(v) => { setFilterOtpStatus(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] sm:w-[150px] h-9"><SelectValue placeholder="OTP" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All OTP Status</SelectItem>
                  <SelectItem value="OK">Valid (OK)</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="NOT_SENT">Not Sent</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="LOCKED">Locked</SelectItem>
                  <SelectItem value="USED">Used</SelectItem>
                </SelectContent>
              </Select>
            )} */}
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[90px] sm:w-[100px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / pg</SelectItem>
                <SelectItem value="25">25 / pg</SelectItem>
                <SelectItem value="50">50 / pg</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <div className="rounded-md border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading appointments...</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No appointments found matching your filters</div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    <Checkbox checked={selectedIds.length === filteredAppointments.length && filteredAppointments.length > 0} onCheckedChange={toggleSelectAll} />
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Visitor Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Mobile & Visitor ID</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">OTP Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">In-Time</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Out-Time</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Visit Date & Time</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle"><Checkbox checked={selectedIds.includes(apt.id)} onCheckedChange={() => toggleSelect(apt.id)} /></td>
                    <td className="p-4 align-middle font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold">{apt.visitorName}</span>
                        <span className="text-xs text-muted-foreground">{apt.email || 'No email'}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex flex-col">
                        <span className="text-sm">{apt.phone}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">ID: {apt.visitorId}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">{getStatusBadge(apt.status)}</td>
                    <td className="p-4 align-middle">{getOtpBadge(apt.otpStatus)}</td>
                    <td className="p-4 align-middle text-sm">{apt.checkInTime}</td>
                    <td className="p-4 align-middle text-sm">{apt.checkOutTime}</td>
                    <td className="p-4 align-middle"><div className="flex flex-col"><span className="text-sm">{apt.date}</span><span className="text-xs text-muted-foreground">{apt.time}</span></div></td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {apt.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success hover:bg-success/10" onClick={() => handleApprove(apt.id)} title="Approve"><CheckCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setRejectModal({ isOpen: true, appointmentId: apt.id, visitorName: apt.visitorName })} title="Reject"><XCircle className="h-4 w-4" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewModal({ isOpen: true, appointment: apt })} title="Preview Details"><Eye className="h-4 w-4" /></Button>
                        {['approved', 'expected', 'checked-in'].includes(apt.status) && (apt.email || apt.phone) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleResendOTP(apt.id, apt.visitorName)} title="Resend OTP"><Send className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRescheduleModal({ isOpen: true, appointmentId: apt.id, currentDate: apt.date, currentTime: apt.time, visitorName: apt.visitorName })} title="Reschedule"><RefreshCw className="h-4 w-4" /></Button>
                        {mode === 'admin' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRegenerateOTP(apt.id)} title="Regenerate OTP"><Key className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLogsModal({ isOpen: true, appointmentId: apt.id, visitorName: apt.visitorName })} title="View Logs"><History className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="gradient-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <RescheduleAppointmentModal
        isOpen={rescheduleModal.isOpen}
        onClose={() => setRescheduleModal({ isOpen: false, appointmentId: "" })}
        appointmentId={rescheduleModal.appointmentId}
        currentDate={rescheduleModal.currentDate}
        currentTime={rescheduleModal.currentTime}
        visitorName={rescheduleModal.visitorName}
        onSuccess={() => { fetchAppointments(); fetchStats(); }}
        mode={mode}
      />
      <RejectAppointmentModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, appointmentId: "" })}
        appointmentId={rejectModal.appointmentId}
        visitorName={rejectModal.visitorName}
        onSuccess={() => { fetchAppointments(); fetchStats(); }}
        mode={mode}
      />
      <AppointmentLogsViewer
        isOpen={logsModal.isOpen}
        onClose={() => setLogsModal({ isOpen: false, appointmentId: "" })}
        appointmentId={logsModal.appointmentId}
        visitorName={logsModal.visitorName}
      />

      {/* Preview/View Details Modal with Full Information */}
      {previewModal.isOpen && previewModal.appointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-background rounded-lg shadow-lg border overflow-hidden">
            <Card className="border-0">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Appointment Details</CardTitle>
                    <CardDescription>Complete visitor information and appointment status</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setPreviewModal({ isOpen: false, appointment: null })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Visitor Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Visitor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Full Name</p>
                      <p className="text-sm font-semibold">{previewModal.appointment.visitorName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Visitor ID</p>
                      <p className="text-sm font-mono">{previewModal.appointment.visitorId}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Mobile Number</p>
                      <p className="text-sm">{previewModal.appointment.phone || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Email Address</p>
                      <p className="text-sm break-all">{previewModal.appointment.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Appointment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Meeting With</p>
                      <p className="text-sm font-semibold">{previewModal.appointment.meetingPerson}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Department</p>
                      <p className="text-sm">{previewModal.appointment.department}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Visit Date</p>
                      <p className="text-sm">{previewModal.appointment.date}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Visit Time</p>
                      <p className="text-sm">{previewModal.appointment.time}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Status</p>
                      {getStatusBadge(previewModal.appointment.status)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">OTP Status</p>
                      {getOtpBadge(previewModal.appointment.otpStatus)}
                    </div>
                  </div>
                </div>

                {/* Purpose of Visit */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Purpose of Visit</h3>
                  <div className="bg-muted/50 p-4 rounded-md border">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{previewModal.appointment.purpose}</p>
                  </div>
                </div>

                {/* Attendees */}
                {previewModal.appointment.attendees && previewModal.appointment.attendees.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Additional Attendees</h3>
                    <div className="space-y-2">
                      {previewModal.appointment.attendees.map((attendee, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/30 p-3 rounded-md border">
                          <span className="text-sm font-medium">{attendee.name}</span>
                          <span className="text-sm text-muted-foreground">{attendee.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Check-in/Check-out Times */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Entry/Exit Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Check-in Time</p>
                      <p className="text-sm font-semibold">{previewModal.appointment.checkInTime}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Check-out Time</p>
                      <p className="text-sm font-semibold">{previewModal.appointment.checkOutTime}</p>
                    </div>
                  </div>
                </div>

                {/* Rejection/Reschedule Reasons */}
                {previewModal.appointment.rejectionReason && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-destructive uppercase tracking-wide">Rejection Reason</h3>
                    <div className="bg-destructive/10 p-4 rounded-md border border-destructive/20">
                      <p className="text-sm">{previewModal.appointment.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {previewModal.appointment.rescheduleReason && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wide">Reschedule Reason</h3>
                    <div className="bg-blue-500/10 p-4 rounded-md border border-blue-500/20">
                      <p className="text-sm">{previewModal.appointment.rescheduleReason}</p>
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {previewModal.appointment.notes && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Internal Notes</h3>
                    <div className="bg-muted/50 p-4 rounded-md border">
                      <p className="text-sm whitespace-pre-wrap">{previewModal.appointment.notes}</p>
                    </div>
                  </div>
                )}

                {/* System Information */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">System Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Created At</p>
                      <p className="text-xs">{previewModal.appointment.createdAt}</p>
                    </div>
                    {previewModal.appointment.otpExpiresAt && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">OTP Expires At</p>
                        <p className="text-xs">{new Date(previewModal.appointment.otpExpiresAt).toLocaleString('en-US')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <div className="border-t p-4 bg-muted/20 flex justify-between gap-2">
                <div className="flex gap-2">
                  {['approved', 'expected', 'checked-in'].includes(previewModal.appointment.status) &&
                    (previewModal.appointment.email || previewModal.appointment.phone) && (
                      <Button variant="outline" className="text-blue-500 border-blue-500 hover:bg-blue-50" onClick={() => {
                        handleResendOTP(previewModal.appointment!.id, previewModal.appointment!.visitorName);
                        setPreviewModal({ isOpen: false, appointment: null });
                      }}>
                        <Send className="h-4 w-4 mr-2" /> Resend OTP
                      </Button>
                    )}
                </div>
                <div className="flex gap-2">
                  {previewModal.appointment.status === "pending" && (
                    <>
                      <Button variant="outline" className="text-success border-success hover:bg-success/10" onClick={() => {
                        handleApprove(previewModal.appointment!.id);
                        setPreviewModal({ isOpen: false, appointment: null });
                      }}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Approve
                      </Button>
                      <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => {
                        setPreviewModal({ isOpen: false, appointment: null });
                        setRejectModal({ isOpen: true, appointmentId: previewModal.appointment!.id, visitorName: previewModal.appointment!.visitorName });
                      }}>
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={() => setPreviewModal({ isOpen: false, appointment: null })}>Close</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
