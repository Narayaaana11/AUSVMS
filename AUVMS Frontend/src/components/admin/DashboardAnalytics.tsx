import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/card";
import { Badge } from "@/components/data-display/badge";
import { BarChart3, TrendingUp, Users, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { apiService } from "@/services/apiService";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
    totalVisitors: number;
    peakHour: string;
    averageVisitDuration: string;
    appointmentSuccessRate: number;
    averageProcessingTime: string;
    departmentStats: { name: string; visitors: number }[];
    visitorTrends: { date: string; count: number }[];
}

export const DashboardAnalytics = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);

                // Fetch all analytics data in parallel
                const [overviewData, trendsData, deptData, metricsData] = await Promise.all([
                    apiService.getAnalyticsOverview(),
                    apiService.getVisitorTrends('7d'),
                    apiService.getDepartmentDistribution('30d'),
                    apiService.getProcessingMetrics(),
                ]);

                // Transform data for chart components
                const departmentStats = deptData.map((dept) => ({
                    name: dept.department,
                    visitors: dept.count,
                }));

                const visitorTrends = trendsData.map((trend) => ({
                    date: trend.date,
                    count: trend.count,
                }));

                const statsData: DashboardStats = {
                    totalVisitors: overviewData.totalVisitorsThisMonth,
                    peakHour: overviewData.peakHour,
                    averageVisitDuration: `${overviewData.avgVisitDurationMinutes} min`,
                    appointmentSuccessRate: overviewData.successRate,
                    averageProcessingTime: `${metricsData.avgProcessingTimeHours.toFixed(1)} hrs`,
                    departmentStats,
                    visitorTrends,
                };

                setStats(statsData);
            } catch (error: any) {
                console.error("Failed to fetch dashboard stats:", error);
                toast({
                    title: "Error",
                    description: "Failed to load dashboard analytics",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [toast]);

    if (loading) {
        return <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>;
    }

    if (!stats) {
        return <div className="text-center py-8 text-muted-foreground">Failed to load analytics</div>;
    }

    return (
        <div className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visitor Trends */}
                <Card className="gradient-card shadow-soft">
                    <CardHeader>
                        <CardTitle>Visitor Trends</CardTitle>
                        <CardDescription>Weekly visitor activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={stats.visitorTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    name="Visitors"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Department Distribution */}
                <Card className="gradient-card shadow-soft">
                    <CardHeader>
                        <CardTitle>Department Distribution</CardTitle>
                        <CardDescription>Visitors by department</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.departmentStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="visitors" fill="#3b82f6" name="Visitors" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Summary Card */}
            <Card className="gradient-card shadow-soft">
                <CardHeader>
                    <CardTitle>Processing Metrics</CardTitle>
                    <CardDescription>System performance overview</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. Processing Time</p>
                            <p className="text-lg font-semibold mt-1">{stats.averageProcessingTime}</p>
                            <p className="text-xs text-muted-foreground mt-2">Request to approval</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. Visit Duration</p>
                            <p className="text-lg font-semibold mt-1">{stats.averageVisitDuration}</p>
                            <p className="text-xs text-muted-foreground mt-2">On campus</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">Monthly Visitors</p>
                            <p className="text-lg font-semibold mt-1">{stats.totalVisitors}</p>
                            <p className="text-xs text-muted-foreground mt-2">Total count</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
