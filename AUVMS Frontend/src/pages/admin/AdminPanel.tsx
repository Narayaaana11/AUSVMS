import { useEffect, useState } from "react";
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
import { Input } from "@/components/input/input";
import { Label } from "@/components/input/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/input/select";
import { StatusBadge } from "@/components/data-display/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/data-display/table";
import {
  Settings,
  Users,
  Shield,
  BarChart3,
  Download,
  Plus,
  Edit,
  Trash,
  ArrowLeft,
  Clock,
  CheckCircle,
  UserCheck,
  Building,
  Activity,
  Radio,
  LogOut,
  KeyRound,
  FileText,
  Bell,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { DashboardAnalytics } from "@/components/admin/DashboardAnalytics";
import { AppointmentManagement } from "@/components/admin/AppointmentManagement";
import { useAuth } from "@/contexts/AuthContext";

import { EmailSMSSettings } from "@/components/admin/EmailSMSSettings";
import { UserManagement } from "@/components/admin/UserManagement";

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  // Backend-powered dashboard stats
  const [stats, setStats] = useState<{
    activeVisitors: number;
    checkedOutToday: number;
    totalUsers: number;
    pendingApprovals: number;
  } | null>(null);
  const [todayVisitors, setTodayVisitors] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingVisitors, setLoadingVisitors] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });

    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  useEffect(() => {
    (async () => {
      try {
        setLoadingStats(true);
        const analyticsData = await apiService.getAnalyticsOverview();
        setStats({
          activeVisitors: analyticsData.activeVisitors,
          checkedOutToday: analyticsData.checkedOutToday,
          totalUsers: analyticsData.totalUsers,
          pendingApprovals: analyticsData.pendingApprovals,
        });
      } catch (e: any) {
        setStats(null);
      } finally {
        setLoadingStats(false);
      }
      try {
        setLoadingVisitors(true);
        const list = await apiService.getTodayVisitors();
        setTodayVisitors(list);
      } catch {
        setTodayVisitors([]);
      } finally {
        setLoadingVisitors(false);
      }
    })();
  }, []);

  return (
    <div id="main-content" className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/auslogo.png"
                alt="Aditya University"
                className="h-10 w-auto rounded-lg"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  System management and configuration
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">System Administrator</p>
                <p className="text-sm text-muted-foreground">Full Access</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout from admin panel"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards (Backend) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="gradient-card shadow-soft relative overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Visitors
                  </p>
                  <p className="text-3xl font-bold text-success">
                    {loadingStats || !stats ? "—" : stats.activeVisitors}
                  </p>
                </div>
                <div className="text-success">
                  <Radio className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-soft relative overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Checked Out Today
                  </p>
                  <p className="text-3xl font-bold text-muted-foreground">
                    {loadingStats || !stats ? "—" : stats.checkedOutToday}
                  </p>
                </div>
                <div className="text-muted-foreground">
                  <Clock className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-soft relative overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {loadingStats || !stats ? "—" : stats.totalUsers}
                  </p>
                </div>
                <div className="text-primary">
                  <Users className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-soft relative overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Approvals
                  </p>
                  <p className="text-3xl font-bold text-warning">
                    {loadingStats || !stats ? "—" : stats.pendingApprovals}
                  </p>
                </div>
                <div className="text-warning">
                  <CheckCircle className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="offices" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Offices
            </TabsTrigger>
            <TabsTrigger
              value="appointments"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="email-sms" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Email/SMS
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <DashboardAnalytics />
          </TabsContent>

          {/* User Management (Formerly Guards) */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          {/* Departments & Offices Management - Coming Soon */}
          <TabsContent value="offices" className="space-y-6">
            <Card className="gradient-card shadow-soft">
              <CardContent className="py-12 text-center">
                <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Departments & Offices Management
                </h3>
                <p className="text-muted-foreground">
                  This module is being rebuilt with enhanced department tracking
                  and visitor analytics.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointment Management */}
          <TabsContent value="appointments" className="space-y-6">
            <AppointmentManagement />
          </TabsContent>

          {/* Email/SMS Settings */}
          <TabsContent value="email-sms" className="space-y-6">
            <EmailSMSSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;
