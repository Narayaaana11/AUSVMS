import { useState, useEffect } from "react";
import { Button } from "@/components/input/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/data-display/card";
import { Badge } from "@/components/data-display/badge";
import { Input } from "@/components/input/input";
import { Label } from "@/components/input/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/layout-ui/tabs";
import {
  Users,
  TrendingUp,
  Ban,
  CheckCircle,
  Trash2,
  Plus,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { Pagination } from "@/components/common/Pagination";

interface Visitor {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  lastVisit: string;
  status: "active" | "flagged" | "banned";
  department?: string; // optional, since some may not have it
}

interface VisitorPattern {
  department: string;
  visits: number;
  frequency: string;
  avgDuration: string;
}

interface BannedVisitor {
  id: string;
  name: string;
  reason: string;
  bannedDate: string;
  bannedBy: string;
}

export const EnhancedVisitorManagement = () => {
  const { toast } = useToast();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  const [showBanForm, setShowBanForm] = useState(false);
  const [banData, setBanData] = useState({ visitorId: "", reason: "" });
  const [bannedVisitors, setBannedVisitors] = useState<BannedVisitor[]>([]);
  const [patterns, setPatterns] = useState<VisitorPattern[]>([]);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const response = await apiService.getVisitors({
        page: currentPage,
        pageSize: pageSize,
        q: searchTerm
      });
      const rawList = Array.isArray(response) ? response : (response?.items || []);
      const total = (response as any).total || rawList.length;

      const mappedVisitors: Visitor[] = rawList.map((v: any) => ({
        id: v._id || v.id,
        name: v.name || v.visitorName,
        email: v.email || 'N/A',
        phone: v.phone || 'N/A',
        visits: v.visitCount || 1,
        lastVisit: v.lastVisit ? new Date(v.lastVisit).toLocaleDateString() : 'N/A',
        status: (v.status === 'rejected' || v.status === 'denied') ? 'banned' : (v.status || 'active'),
        department: v.department || 'General'
      }));

      setVisitors(mappedVisitors);
      setTotalPages(Math.max(1, Math.ceil(total / pageSize)));

      // Sync banned visitors
      const banned = mappedVisitors
        .filter(v => v.status === 'banned')
        .map(v => ({
          id: v.id,
          name: v.name,
          reason: (v as any).banReason || 'Policy Violation',
          bannedDate: (v as any).bannedAt ? new Date((v as any).bannedAt).toLocaleDateString() : new Date().toLocaleDateString(),
          bannedBy: (v as any).bannedBy || 'Admin'
        }));
      setBannedVisitors(banned);

    } catch (error: any) {
      console.error("Failed to fetch visitors:", error);
      toast({
        title: "Error",
        description: "Failed to load visitors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchVisitors();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    // derive simple visitor patterns from visitors data
    const deptMap: Record<string, number> = {};
    visitors.forEach((v) => {
      const dept = v.department || "Unknown";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const derived: VisitorPattern[] = Object.keys(deptMap).map((d) => ({
      department: d,
      visits: deptMap[d],
      frequency: "Low", // simplistic placeholder
      avgDuration: "30m", // simplistic placeholder
    }));

    setPatterns(derived);
  }, [visitors]);

  const filteredVisitors = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Visitor["status"]) => {
    const config = {
      active: { bg: "bg-success/10", text: "text-success", label: "Active" },
      flagged: { bg: "bg-warning/10", text: "text-warning", label: "Flagged" },
      banned: { bg: "bg-destructive/10", text: "text-destructive", label: "Banned" },
    } as const;
    const c = config[status] || config.active;
    return <Badge className={`${c.bg} ${c.text}`}>{c.label}</Badge>;
  };

  const handleFlagVisitor = async (visitorId: string) => {
    try {
      await apiService.updateVisitor(visitorId, { status: 'flagged' });
      toast({ title: "Visitor Flagged", description: "Visitor has been flagged for review" });
      fetchVisitors();
    } catch (e) {
      toast({ title: "Error", description: "Failed to flag visitor", variant: "destructive" });
    }
  };

  const handleBanVisitor = async () => {
    if (!banData.visitorId || !banData.reason) {
      toast({
        title: "Validation Error",
        description: "Please select visitor and provide reason",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiService.updateVisitor(banData.visitorId, {
        status: 'banned',
        banReason: banData.reason,
        bannedAt: new Date().toISOString()
      });
      toast({
        title: "Visitor Banned",
        description: "Visitor has been banned successfully",
      });

      setShowBanForm(false);
      setBanData({ visitorId: "", reason: "" });
      fetchVisitors();
    } catch (e) {
      toast({ title: "Error", description: "Failed to ban visitor", variant: "destructive" });
    }
  };

  const handleUnban = async (bannedId: string) => {
    if (window.confirm("Are you sure you want to unban this visitor?")) {
      try {
        await apiService.updateVisitor(bannedId, { status: 'active', banReason: null });
        toast({
          title: "Unbanned",
          description: "Visitor has been removed from ban list",
        });
        fetchVisitors();
      } catch (e) {
        toast({ title: "Error", description: "Failed to unban visitor", variant: "destructive" });
      }
    }
  };

  const handleDeleteVisitor = async (visitorId: string) => {
    if (window.confirm("Are you sure you want to delete this visitor record?")) {
      try {
        await apiService.deleteVisitor(visitorId);
        toast({
          title: "Deleted",
          description: "Visitor record has been deleted",
        });
        fetchVisitors();
      } catch (e) {
        toast({ title: "Error", description: "Failed to delete visitor", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Visitor History
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="banned" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Banned List
          </TabsTrigger>
        </TabsList>

        {/* Visitor History Tab */}
        <TabsContent value="history" className="space-y-6">
          {/* Search and Filter */}
          <Card className="gradient-card shadow-soft">
            <CardContent className="p-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button className="gradient-primary">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Visitors List */}
          <div className="space-y-3">
            {loading ? (
              <Card className="gradient-card shadow-soft">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Loading visitors...
                </CardContent>
              </Card>
            ) : filteredVisitors.length === 0 ? (
              <Card className="gradient-card shadow-soft">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No visitors found
                </CardContent>
              </Card>
            ) : (
              filteredVisitors.map((visitor) => (
                <Card
                  key={visitor.id}
                  className="gradient-card shadow-soft hover:shadow-lg transition"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-lg">{visitor.name}</p>
                          {getStatusBadge(visitor.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{visitor.email}</p>
                        <p className="text-sm text-muted-foreground">{visitor.phone}</p>
                        <div className="flex gap-4 mt-3 text-sm">
                          <span>
                            <strong>{visitor.visits}</strong> visits
                          </span>
                          <span>
                            Last: <strong>{visitor.lastVisit}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {visitor.status !== "flagged" &&
                          visitor.status !== "banned" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFlagVisitor(visitor.id)}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Flag
                            </Button>
                          )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteVisitor(visitor.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

          </div>

          <div className="flex justify-end mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Statistics */}
          <Card className="gradient-card shadow-soft">
            <CardHeader>
              <CardTitle>Visitor Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{visitors.length}</p>
                  <p className="text-sm text-muted-foreground">Total Visitors</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-2xl font-bold text-success">
                    {visitors.filter((v) => v.status === "active").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-2xl font-bold text-warning">
                    {visitors.filter((v) => v.status === "flagged").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Flagged</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-2xl font-bold text-destructive">
                    {bannedVisitors.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Banned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <Card className="gradient-card shadow-soft">
            <CardHeader>
              <CardTitle>Visitor Patterns by Department</CardTitle>
              <CardDescription>
                Analyze visitor distribution and behavior patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{pattern.department}</h4>
                      <Badge className="bg-primary/10 text-primary">
                        {pattern.visits} visits
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Visit Frequency</p>
                        <p className="font-medium">{pattern.frequency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Duration</p>
                        <p className="font-medium">{pattern.avgDuration}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {patterns.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No visitor data available to derive patterns.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-soft">
            <CardHeader>
              <CardTitle>Peak Visiting Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>10:00 AM - 11:00 AM</span>
                  <Badge className="bg-success/10 text-success">Peak</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>2:00 PM - 3:00 PM</span>
                  <Badge className="bg-success/10 text-success">Peak</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>11:00 AM - 12:00 PM</span>
                  <Badge className="bg-warning/10 text-warning">High</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banned Visitors Tab */}
        <TabsContent value="banned" className="space-y-6">
          <div className="flex justify-end">
            <Button
              className="gradient-primary"
              onClick={() => setShowBanForm(!showBanForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ban Visitor
            </Button>
          </div>

          {showBanForm && (
            <Card className="gradient-card shadow-soft border-destructive/50">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Select Visitor to Ban</Label>
                  <select
                    value={banData.visitorId}
                    onChange={(e) =>
                      setBanData({ ...banData, visitorId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Choose a visitor...</option>
                    {visitors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Ban</Label>
                  <Input
                    value={banData.reason}
                    onChange={(e) =>
                      setBanData({ ...banData, reason: e.target.value })
                    }
                    placeholder="Specify reason..."
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBanForm(false);
                      setBanData({ visitorId: "", reason: "" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="gradient-primary bg-destructive hover:bg-destructive/90"
                    onClick={handleBanVisitor}
                  >
                    Ban Visitor
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {bannedVisitors.length === 0 ? (
              <Card className="gradient-card shadow-soft">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No banned visitors
                </CardContent>
              </Card>
            ) : (
              bannedVisitors.map((banned) => (
                <Card
                  key={banned.id}
                  className="gradient-card shadow-soft border-destructive/30"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">{banned.name}</p>
                        <div className="text-sm text-muted-foreground mt-2 space-y-1">
                          <p>Reason: {banned.reason}</p>
                          <p>Banned on: {banned.bannedDate}</p>
                          <p>Banned by: {banned.bannedBy}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnban(banned.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Unban
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
