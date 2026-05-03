import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/data-display";
import { Input } from "@/components/input";
import { Label } from "@/components/input";
import { Badge } from "@/components/data-display";
// Using single-page layout (no sidebar) to show Dashboard + Entry OTP + Exit OTP together
import {
  Shield,
  CheckCircle,
  Clock,
  User,
  Phone,
  MapPin,
  Calendar,
  Search,
  LogIn,
  LogOut,
  AlertTriangle,
  Flag,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/apiService";
import { debounce } from "lodash";

const GuardPortal = () => {
  const { toast } = useToast();
  const { logout } = useAuth();
  // Single-page layout; no tabs needed
  const [otpInput, setOtpInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [manualSearchTerm, setManualSearchTerm] = useState("");
  const [exitSearchTerm, setExitSearchTerm] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [visitors, setVisitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchVisitors = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getTodayVisitors();
      const mapped = (data || []).map((v: any) => ({
        id: v.id,
        visitorName: v.visitorName ?? v.name ?? "",
        email: v.email ?? "",
        phone: v.phone ?? "",
        purpose: v.purpose ?? "",
        personToMeet: v.personToMeet ?? v.meetingPerson ?? "",
        status: v.status ?? "",
        department: v.department ?? "—",
        appointmentTime:
          v.appointmentTime ?? v.confirmedTime ?? v.timeRequested ?? "",
        vehicleNumber: v.vehicleNumber ?? "",
        isFlagged: v.isFlagged ?? false,
        isExpired: v.isExpired ?? false,
        entryTime: v.entryTime ?? "",
        exitTime: v.exitTime ?? "",
        otp: v.otp,
      }));
      setVisitors(mapped);
    } catch (error) {
      console.error("Failed to fetch visitors:", error);
      toast({
        title: "Error",
        description: "Failed to load visitors. Please try again.",
        variant: "destructive",
      });
      setVisitors([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const validateOTP = (otp: string) => {
    if (!/^\d{6}$/.test(otp)) {
      setErrors((prev) => ({ ...prev, otp: "OTP must be 6 digits" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, otp: "" }));
    return true;
  };

  const handleOtpVerification = async () => {
    if (!validateOTP(otpInput)) return;

    setIsSubmitting(true);
    try {
      const response = await apiService.verifyEntry(otpInput);
      if (response.success) {
        toast({
          title: "Success",
          description: "Visitor check-in successful",
          variant: "default",
        });
        fetchVisitors(); // Refresh list
      } else {
        toast({
          title: "Error",
          description: response.message || "Invalid OTP",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setOtpInput("");
    }
  };

  const debouncedManualSearch = useMemo(
    () =>
      debounce(async (term: string) => {
        if (!term.trim()) return;
        try {
          const data = await apiService.searchVisitorGuard(term);
          // data should be an array now from searchVisitorGuard
          if (Array.isArray(data) && data.length > 0) {
            // For now, pick the first one or show list?
            // The original code expected a single visitor object from searchVisitor
            // But searchVisitorGuard returns an array.
            // Let's just take the first for the modal if exact match, or handle array?
            // Existing logic: setSelectedVisitor(data).
            // I'll update to: setSelectedVisitor(data[0]) if it's the only one, or...
            // To be safe and compatible with previous UI flow which seemed to expect one result or exact match:
            setSelectedVisitor(data[0]);
            setShowVisitorModal(true);
          } else {
            toast({
              title: "Visitor Not Found",
              description: "No appointment found.",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Search failed.",
            variant: "destructive",
          });
        }
      }, 500),
    [toast],
  );

  const handleManualSearch = () => {
    debouncedManualSearch(manualSearchTerm);
  };

  const handleExitAction = async () => {
    if (!exitSearchTerm.trim()) return;

    // If it looks like an OTP (6 digits), try direct exit verification first
    if (/^\d{6}$/.test(exitSearchTerm)) {
      setIsSubmitting(true);
      try {
        const response = await apiService.verifyExit(exitSearchTerm);
        if (response.success) {
          toast({
            title: "Success",
            description: "Visitor check-out successful",
          });
          setExitSearchTerm("");
          fetchVisitors();
          return;
        }
      } catch (e) {
        // If OTP exit fails, fall through to search?
        // Usually if OTP matches but fails (e.g. already exited), we should show that error.
        // If OTP is invalid (404), maybe it's just a phone number that looks like OTP?
        // Let's assume strict OTP exit if 6 digits for now to meet "Same OTP -> marks exit" requirement.
        // But if it fails, we might want to search.
        // For now, I'll catch and show error.
        toast({
          title: "Error",
          description: "Invalid OTP or Check-out failed",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    // Fallback to search if not OTP or if we want to search by name/phone
    // Original logic was search.
    setIsSubmitting(true);
    try {
      debouncedExitSearch(exitSearchTerm);
    } finally {
      setIsSubmitting(false);
    }
  };

  const debouncedExitSearch = useMemo(
    () =>
      debounce(async (term: string) => {
        // ... existing search logic adapted for array
        if (!term.trim()) return;
        try {
          const data = await apiService.searchVisitorGuard(term);
          // Filter for those inside campus? Or let searchVisitorGuard handle it?
          // searchVisitorGuard returns matching visitors.
          // We probably want to find one that is "inside".
          const inside = data.filter((v: any) => v.status === "checked-in");
          if (inside.length > 0) {
            setSelectedVisitor(inside[0]);
            setShowExitModal(true);
          } else {
            // If no one inside found, maybe show generic message?
            if (data.length > 0) {
              toast({
                title: "Info",
                description:
                  "Visitor found but not currently marked 'Inside Campus'.",
                variant: "default",
              });
            } else {
              toast({
                title: "Visitor Not Found",
                description: "No matching visitor found.",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Search failed.",
            variant: "destructive",
          });
        }
      }, 500),
    [toast],
  );

  const handleExitSearch = handleExitAction; // Alias for the button

  const markEntry = async (visitorId: string) => {
    // This is manual mark entry (without OTP) - kept for fallback/flagged scenarios?
    // Or should we require OTP? The prompt says "Entry allowed only if... OTP not expired".
    // Does it mandate OTP entry? "Guard enters OTP -> show success/fail".
    // The "Mark Entry" button in the modal might be an override?
    // I'll leave it as is, but maybe add a note or use a different endpoint if needed.
    // Existing markEntry used apiService.markEntry.
    // I'll keep it for now as "Manual Override" is often needed.
    setIsSubmitting(true);
    try {
      await apiService.markEntry(visitorId);
      toast({ title: "Success", description: "Entry marked manually." });
      setShowVisitorModal(false);
      fetchVisitors();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark entry.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markExit = async (visitorId: string) => {
    // Manual mark exit
    setIsSubmitting(true);
    try {
      await apiService.markExit(visitorId);
      toast({ title: "Success", description: "Exit marked manually." });
      setShowExitModal(false);
      fetchVisitors();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark exit.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const flagVisitor = async (visitorId: string) => {
    setIsSubmitting(true);
    try {
      await apiService.flagVisitor(visitorId);
      toast({ title: "Success", description: "Visitor flagged and notified." });
      fetchVisitors();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to flag visitor.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestReapproval = async (visitorId: string) => {
    setIsSubmitting(true);
    try {
      await apiService.requestReapproval(visitorId);
      toast({ title: "Success", description: "Reapproval requested." });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request reapproval.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVisitorStatus = (visitor: any) => {
    if (visitor.isFlagged)
      return (
        <Badge variant="destructive" className="bg-red-500">
          FLAGGED
        </Badge>
      );
    if (visitor.status === "checked-in")
      return (
        <Badge
          variant="secondary"
          className="bg-warning text-warning-foreground"
        >
          Inside Campus
        </Badge>
      );
    if (visitor.status === "checked-out" || visitor.status === "completed")
      return (
        <Badge variant="outline" className="bg-muted">
          Completed
        </Badge>
      );
    if (visitor.status === "rescheduled")
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary">
          Rescheduled
        </Badge>
      );
    if (visitor.status === "approved" || visitor.status === "expected")
      return (
        <Badge
          variant="secondary"
          className="bg-success text-success-foreground"
        >
          Approved
        </Badge>
      );
    if (visitor.status === "pending")
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Pending
        </Badge>
      );
    if (visitor.status === "rejected" || visitor.status === "cancelled")
      return (
        <Badge variant="destructive" className="bg-red-500">
          Not Allowed
        </Badge>
      );
    if (visitor.entryTime && visitor.exitTime)
      return (
        <Badge variant="outline" className="bg-muted">
          Completed
        </Badge>
      );
    if (visitor.entryTime)
      return (
        <Badge
          variant="secondary"
          className="bg-warning text-warning-foreground"
        >
          Inside Campus
        </Badge>
      );
    if (visitor.isExpired)
      return (
        <Badge variant="destructive" className="bg-red-500">
          Expired
        </Badge>
      );
    return (
      <Badge variant="secondary" className="bg-success text-success-foreground">
        Expected
      </Badge>
    );
  };

  const filteredVisitors = visitors.filter((visitor) => {
    const q = (searchTerm || "").toLowerCase();
    const name = (visitor.visitorName || "").toLowerCase();
    const phone = visitor.phone || "";
    const meet = (visitor.personToMeet || "").toLowerCase();
    const matchesSearch =
      name.includes(q) || phone.includes(searchTerm || "") || meet.includes(q);

    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "inside")
      return matchesSearch && visitor.entryTime && !visitor.exitTime;
    if (filterStatus === "exited")
      return matchesSearch && visitor.entryTime && visitor.exitTime;
    return matchesSearch;
  });

  const expectedVisitors = filteredVisitors.filter((v) => !v.entryTime);
  const insideVisitors = filteredVisitors.filter(
    (v) => v.entryTime && !v.exitTime,
  );
  const completedVisitors = filteredVisitors.filter(
    (v) => v.entryTime && v.exitTime,
  );

  const paginatedVisitors = filteredVisitors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const VisitorCard = ({ visitor }: { visitor: any }) => (
    <Card className="gradient-card shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 min-w-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg truncate">
              {visitor.visitorName}
            </CardTitle>
            <CardDescription className="text-sm truncate">
              Meeting: {visitor.personToMeet}
            </CardDescription>
          </div>
          <div className="flex-shrink-0">{getVisitorStatus(visitor)}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
            <span className="truncate">
              Expected: {visitor.appointmentTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
            <span className="truncate">{visitor.phone}</span>
          </div>
          {visitor.vehicleNumber && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
              <span className="truncate">{visitor.vehicleNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
            <span className="truncate">{visitor.department}</span>
          </div>
        </div>

        {visitor.entryTime && (
          <div className="text-xs sm:text-sm space-y-1">
            <div className="flex items-center gap-2">
              <LogIn className="h-3 w-3 sm:h-4 sm:w-4 text-success flex-shrink-0" />
              <span>Entry: {visitor.entryTime}</span>
            </div>
            {visitor.exitTime && (
              <div className="flex items-center gap-2">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
                <span>Exit: {visitor.exitTime}</span>
              </div>
            )}
          </div>
        )}

        <div className="text-xs sm:text-sm">
          <p className="text-muted-foreground">{visitor.purpose}</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {!visitor.entryTime && !visitor.isExpired && (
            <Button
              size="sm"
              onClick={() => markEntry(visitor.id)}
              className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-8 sm:h-9"
              disabled={isSubmitting}
            >
              <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Mark Entry
            </Button>
          )}
          {visitor.entryTime && !visitor.exitTime && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markExit(visitor.id)}
              className="text-xs sm:text-sm h-8 sm:h-9"
              disabled={isSubmitting}
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Mark Exit
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => flagVisitor(visitor.id)}
            className="text-xs sm:text-sm h-8 sm:h-9"
            disabled={visitor.isFlagged || isSubmitting}
          >
            <Flag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Flag
          </Button>
          {visitor.isExpired && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => requestReapproval(visitor.id)}
              className="text-xs sm:text-sm h-8 sm:h-9"
              disabled={isSubmitting}
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Reapprove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div id="main-content" className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/auslogo.png"
              alt="Aditya University"
              className="h-8 sm:h-9 w-auto rounded-lg"
            />
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">
              Guard Portal
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchVisitors}
              className="h-8 sm:h-9 text-xs sm:text-sm"
              aria-label="Refresh visitor list"
            >
              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" /> Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-8 sm:h-9 text-xs sm:text-sm"
              aria-label="Logout from guard portal"
            >
              <LogOut className="h-4 w-4 mr-1 sm:mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 flex-1">
        <div className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="gradient-card shadow-medium">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5" /> OTP Entry
                  Verification
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Enter the 6-digit OTP provided by the visitor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1">
                    <Label htmlFor="otp" className="text-sm sm:text-base">
                      OTP Code
                    </Label>
                    <Input
                      id="otp"
                      value={otpInput}
                      onChange={(e) =>
                        setOtpInput(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="text-center text-base sm:text-lg font-mono h-12 sm:h-14"
                    />
                    {errors.otp && (
                      <p className="text-destructive text-xs mt-1">
                        {errors.otp}
                      </p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleOtpVerification}
                      disabled={otpInput.length !== 6 || isSubmitting}
                      className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto h-12 sm:h-14 text-base sm:text-lg"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Verify OTP
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-medium">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" /> OTP Exit Logging
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Search visitor by OTP or details to mark exit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1">
                    <Label
                      htmlFor="exit-search"
                      className="text-sm sm:text-base"
                    >
                      Search
                    </Label>
                    <Input
                      id="exit-search"
                      value={exitSearchTerm}
                      onChange={(e) => setExitSearchTerm(e.target.value)}
                      placeholder="OTP, name, or phone"
                      className="h-12 sm:h-14 text-base sm:text-lg"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleExitSearch}
                      disabled={!exitSearchTerm.trim() || isSubmitting}
                      className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto h-12 sm:h-14 text-base sm:text-lg"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Search & Exit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <Card className="gradient-card shadow-soft">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Expected Today
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                      {expectedVisitors.length}
                    </p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="gradient-card shadow-soft">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Inside Campus
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-warning">
                      {insideVisitors.length}
                    </p>
                  </div>
                  <User className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-warning" />
                </div>
              </CardContent>
            </Card>
            <Card className="gradient-card shadow-soft">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Completed
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-success">
                      {completedVisitors.length}
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-success" />
                </div>
              </CardContent>
            </Card>
            <Card className="gradient-card shadow-soft">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Flagged
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-500">
                      {visitors.filter((v) => v.isFlagged).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="gradient-card shadow-medium">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" /> Daily Visitor Log
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Track all visitors and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    placeholder="Search visitors by name, phone, or staff member..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border-0 bg-transparent w-full sm:max-w-md h-10 sm:h-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
                  <Button
                    variant={filterStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterStatus("all");
                      setCurrentPage(1);
                    }}
                    className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                  >
                    All Today
                  </Button>
                  <Button
                    variant={filterStatus === "inside" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterStatus("inside");
                      setCurrentPage(1);
                    }}
                    className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                  >
                    Inside Campus
                  </Button>
                  <Button
                    variant={filterStatus === "exited" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterStatus("exited");
                      setCurrentPage(1);
                    }}
                    className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                  >
                    Exited
                  </Button>
                </div>
              </div>
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                          <tr>
                            <th className="p-4">Visitor</th>
                            <th className="p-4">Meeting</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Timings</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paginatedVisitors.length > 0 ? (
                            paginatedVisitors.map((visitor) => (
                              <tr
                                key={visitor.id}
                                className="hover:bg-muted/50 transition-colors"
                              >
                                <td className="p-4">
                                  <div className="font-medium">
                                    {visitor.visitorName}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />{" "}
                                    {visitor.phone}
                                  </div>
                                  {visitor.vehicleNumber && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      <MapPin className="h-3 w-3 inline mr-1" />{" "}
                                      {visitor.vehicleNumber}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="font-medium">
                                    {visitor.personToMeet}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {visitor.department}
                                  </div>
                                  <div
                                    className="text-xs text-muted-foreground truncate max-w-[150px]"
                                    title={visitor.purpose}
                                  >
                                    {visitor.purpose}
                                  </div>
                                </td>
                                <td className="p-4">
                                  {getVisitorStatus(visitor)}
                                </td>
                                <td className="p-4 text-xs space-y-1">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />{" "}
                                    Exp: {visitor.appointmentTime}
                                  </div>
                                  {visitor.entryTime && (
                                    <div className="flex items-center gap-1 text-success">
                                      <LogIn className="h-3 w-3" /> In:{" "}
                                      {visitor.entryTime}
                                    </div>
                                  )}
                                  {visitor.exitTime && (
                                    <div className="flex items-center gap-1 text-destructive">
                                      <LogOut className="h-3 w-3" /> Out:{" "}
                                      {visitor.exitTime}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2 flex-wrap">
                                    {!visitor.entryTime &&
                                      !visitor.isExpired && (
                                        <Button
                                          size="sm"
                                          onClick={() => markEntry(visitor.id)}
                                          className="bg-green-600 hover:bg-green-700 h-8"
                                          disabled={isSubmitting}
                                          title="Mark Entry"
                                        >
                                          <LogIn className="h-4 w-4" />
                                        </Button>
                                      )}
                                    {visitor.entryTime && !visitor.exitTime && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => markExit(visitor.id)}
                                        className="h-8"
                                        disabled={isSubmitting}
                                        title="Mark Exit"
                                      >
                                        <LogOut className="h-4 w-4 text-destructive" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedVisitor(visitor);
                                        setShowVisitorModal(true);
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Search className="h-4 w-4" />
                                    </Button>
                                    {visitor.isExpired && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          requestReapproval(visitor.id)
                                        }
                                        className="h-8 w-8 p-0"
                                        disabled={isSubmitting}
                                        title="Reapprove"
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-8 text-center text-muted-foreground"
                              >
                                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                No visitors found matching your criteria
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Pagination Controls */}
                  {filteredVisitors.length > 0 && (
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to{" "}
                        {Math.min(
                          currentPage * pageSize,
                          filteredVisitors.length,
                        )}{" "}
                        of {filteredVisitors.length} entries
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) =>
                              Math.min(
                                Math.ceil(filteredVisitors.length / pageSize),
                                p + 1,
                              ),
                            )
                          }
                          disabled={
                            currentPage >=
                            Math.ceil(filteredVisitors.length / pageSize)
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {showVisitorModal && selectedVisitor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <Card className="w-full max-w-sm sm:max-w-md mx-4">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">
                Visitor Details
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Appointment Information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-2 text-sm sm:text-base">
                <p>
                  <strong>Name:</strong> {selectedVisitor.visitorName}
                </p>
                <p>
                  <strong>Email:</strong> {selectedVisitor.email}
                </p>
                <p>
                  <strong>Phone:</strong> {selectedVisitor.phone}
                </p>
                <p>
                  <strong>Purpose:</strong> {selectedVisitor.purpose}
                </p>
                <p>
                  <strong>Meeting:</strong> {selectedVisitor.personToMeet}
                </p>
                <p>
                  <strong>Department:</strong> {selectedVisitor.department}
                </p>
                <p>
                  <strong>Time:</strong> {selectedVisitor.appointmentTime}
                </p>
                {selectedVisitor.vehicleNumber && (
                  <p>
                    <strong>Vehicle:</strong> {selectedVisitor.vehicleNumber}
                  </p>
                )}
                {getVisitorStatus(selectedVisitor)}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                {!selectedVisitor.entryTime && !selectedVisitor.isExpired && (
                  <Button
                    onClick={() => markEntry(selectedVisitor.id)}
                    className="bg-green-600 hover:bg-green-700 h-10 sm:h-9"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    Mark Entry
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowVisitorModal(false)}
                  className="h-10 sm:h-9"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showExitModal && selectedVisitor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <Card className="w-full max-w-sm sm:max-w-md mx-4">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Confirm Exit</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Mark visitor exit from campus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-2 text-sm sm:text-base">
                <p>
                  <strong>Name:</strong> {selectedVisitor.visitorName}
                </p>
                <p>
                  <strong>Entry Time:</strong> {selectedVisitor.entryTime}
                </p>
                <p>
                  <strong>Current Time:</strong>{" "}
                  {new Date()
                    .toLocaleTimeString("en-IN", { hour12: false })
                    .slice(0, 5)}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  onClick={() => markExit(selectedVisitor.id)}
                  className="bg-orange-600 hover:bg-orange-700 h-10 sm:h-9"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Mark Exit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowExitModal(false)}
                  className="h-10 sm:h-9"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GuardPortal;
