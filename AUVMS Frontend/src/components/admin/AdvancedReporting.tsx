import { useState, useEffect } from "react";
import { Button } from "@/components/input/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/card";
import { Input } from "@/components/input/input";
import { Label } from "@/components/input/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/input/select";
import { DatePickerInput } from "@/components/input/DatePickerInput";
import { Download, FileText, Mail, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface ReportData {
    type: "visitor" | "appointment" | "department" | "staff";
    format: "pdf" | "excel";
    startDate: string;
    endDate: string;
}

export const AdvancedReporting = () => {
    const { toast } = useToast();
    const [reportType, setReportType] = useState<"visitor" | "appointment" | "department" | "staff">("visitor");
    const [reportFormat, setReportFormat] = useState<"pdf" | "excel">("pdf");
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [loading, setLoading] = useState(false);
    const [scheduledReports, setScheduledReports] = useState([]);
    const [reportTypeData, setReportTypeData] = useState([]);
    const [monthlyTrends, setMonthlyTrends] = useState([]);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const [daily, monthly] = await Promise.all([
                apiService.getDailyReport(),
                apiService.getMonthlyReport()
            ]);

            // Map Daily Data for Pie Chart
            const distribution = [
                { name: "Checked In", value: daily.checkedIn || 0, color: "#10b981" },
                { name: "Checked Out", value: daily.checkedOut || 0, color: "#f59e0b" },
                { name: "Pending/Other", value: (daily.total - (daily.checkedIn + daily.checkedOut)) || 0, color: "#3b82f6" }
            ].filter(item => item.value > 0);
            setReportTypeData(distribution as any);

            // Map Monthly Data for Bar Chart
            // Backend returns array of { date, total, checkedIn, checkedOut }
            // We want to show Trends (Total Visitors per day)
            const trends = Array.isArray(monthly) ? monthly.map((day: any) => ({
                date: new Date(day.date).getDate(), // Just show day number or format
                visitors: day.total,
                checkedIn: day.checkedIn
            })) : [];
            setMonthlyTrends(trends as any);

            setScheduledReports([]);

        } catch (error: any) {
            console.error("Failed to fetch reports:", error);
            setMonthlyTrends([]);
            setReportTypeData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        try {
            setLoading(true);
            const url = apiService.getReportExportUrl(
                // Use a simpler mapping or default
                'daily',
                startDate ? startDate.toISOString() : new Date().toISOString()
            );

            // Trigger download
            window.open(url, '_blank');

            toast({
                title: "Report Generated",
                description: `${reportType} report generated successfully.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate report",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleReport = () => {
        toast({
            title: "Report Scheduled",
            description: "Your report has been scheduled successfully.",
        });
    };

    return (
        <div className="space-y-6">
            {/* Generate Report Section */}
            <Card className="gradient-card shadow-soft">
                <CardHeader>
                    <CardTitle>Generate Report</CardTitle>
                    <CardDescription>Create custom reports with date range and format selection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Report Type</Label>
                            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="visitor">Visitor Report</SelectItem>
                                    <SelectItem value="appointment">Appointment Report</SelectItem>
                                    <SelectItem value="department">Department Report</SelectItem>
                                    <SelectItem value="staff">Staff Report</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Export Format</Label>
                            <Select value={reportFormat} onValueChange={(value: any) => setReportFormat(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="excel">Excel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <DatePickerInput
                                value={startDate}
                                onChange={setStartDate}
                                placeholder="Select start date"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <DatePickerInput
                                value={endDate}
                                onChange={setEndDate}
                                placeholder="Select end date"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={handleScheduleReport}>
                            <Clock className="h-4 w-4 mr-2" />
                            Schedule Report
                        </Button>
                        <Button className="gradient-primary" onClick={handleGenerateReport} disabled={loading}>
                            <Download className="h-4 w-4 mr-2" />
                            {loading ? "Generating..." : "Generate Report"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Reports Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visitor Status Distribution */}
                <Card className="gradient-card shadow-soft">
                    <CardHeader>
                        <CardTitle>Visitor Status (Today)</CardTitle>
                        <CardDescription>Real-time status distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            {reportTypeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip />
                                        <Legend />
                                        <Pie
                                            data={reportTypeData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {reportTypeData.map((entry: any, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-muted-foreground">No data for today</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly Visitor Activity */}
                <Card className="gradient-card shadow-soft">
                    <CardHeader>
                        <CardTitle>Visitor Activity (This Month)</CardTitle>
                        <CardDescription>Daily visitor counts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyTrends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="date" label={{ value: 'Day', position: 'insideBottom', offset: -5 }} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="visitors" fill="#3b82f6" name="Total Visitors" />
                                    <Bar dataKey="checkedIn" fill="#10b981" name="Checked In" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Scheduled Reports */}
            <Card className="gradient-card shadow-soft">
                <CardHeader>
                    <CardTitle>Scheduled Reports</CardTitle>
                    <CardDescription>Automated reports configured for regular generation</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {scheduledReports.map((report) => (
                            <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="font-medium">{report.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {report.frequency} • Next: {report.nextRun}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${report.status === "active"
                                        ? "bg-success/10 text-success"
                                        : "bg-muted text-muted-foreground"
                                        }`}>
                                        {report.status === "active" ? "Active" : "Inactive"}
                                    </span>
                                    <Button variant="outline" size="sm">
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Email Delivery */}
            <Card className="gradient-card shadow-soft">
                <CardHeader>
                    <CardTitle>Email Delivery</CardTitle>
                    <CardDescription>Configure report email delivery settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Recipient Email Addresses</Label>
                        <Input
                            placeholder="admin@university.edu, manager@university.edu"
                            defaultValue="admin@university.edu"
                        />
                        <p className="text-xs text-muted-foreground">Separate multiple emails with comma</p>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="outline">
                            <Mail className="h-4 w-4 mr-2" />
                            Send Test Email
                        </Button>
                        <Button className="gradient-primary">Save Email Settings</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
