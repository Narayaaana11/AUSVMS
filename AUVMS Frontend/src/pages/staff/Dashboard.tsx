import React from "react";
import { Button } from "@/components/input/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/card";
import { Skeleton } from "@/components/feedback/skeleton";
import { StatsCard } from "@/components/data-display/stats-card";
import { Users, Clock, CheckCircle2, AlertCircle, CheckCircle, BookOpen, ChevronRight, RotateCw, Calendar, XCircle } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

interface DashboardProps {
    setActiveTab: (tab: string) => void;
    refetchStats: () => void;
    roleIncludes: (tab: string) => boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, refetchStats, roleIncludes }) => {
    const { overview, activity, isLoading: dashboardLoading } = useDashboardData();

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex justify-end mb-2">
                <Button onClick={() => refetchStats()} variant="outline" size="sm" disabled={dashboardLoading}>
                    <RotateCw className={`mr-2 h-4 w-4 ${dashboardLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh Stats</span>
                    <span className="sm:hidden">Refresh</span>
                </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
                {dashboardLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 md:h-32 w-full rounded-2xl" />)
                ) : (
                    <>
                        <StatsCard
                            title="Total Appointments"
                            value={overview.totalAppointments}
                            icon={<Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                            description="All time records"
                        />
                        <StatsCard
                            title="Pending Requests"
                            value={overview.pendingRequests}
                            icon={<Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
                            description="Awaiting action"
                        />
                        <StatsCard
                            title="Approved Today"
                            value={overview.approvedToday}
                            icon={<CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
                            description="Granted access"
                        />
                        <StatsCard
                            title="Denied Requests"
                            value={overview.deniedRequests}
                            icon={<AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
                            description="Declined requests"
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="xl:col-span-2 shadow-md border-muted/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                            <Clock className="h-5 w-5 text-primary" /> Recent Activity
                        </CardTitle>
                        <CardDescription className="text-sm">Latest appointment updates and actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dashboardLoading ? (
                            <div className="space-y-3 md:space-y-4">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="flex items-center space-x-3 md:space-x-4 p-3 md:p-4 bg-muted/5 rounded-xl">
                                        <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-full shrink-0" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-5 w-40" />
                                            <Skeleton className="h-4 w-full max-w-xs" />
                                        </div>
                                        <Skeleton className="h-8 w-20 rounded-full hidden sm:block" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1 md:space-y-2">
                                {activity.slice(0, 3).map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="group flex items-center justify-between rounded-xl border border-transparent hover:border-border p-3 md:p-4 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
                                    >
                                        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                                            <div className={`h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center shrink-0 ${item.type === 'APPROVED' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                item.type === 'REJECTED' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                    item.type === 'RESCHEDULED' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                {item.type === 'APPROVED' ? <CheckCircle2 className="h-5 w-5" /> :
                                                    item.type === 'REJECTED' ? <XCircle className="h-5 w-5" /> :
                                                        item.type === 'RESCHEDULED' ? <Calendar className="h-5 w-5" /> :
                                                            <Clock className="h-5 w-5" />}
                                            </div>
                                            <div className="min-w-0 space-y-1">
                                                <p className="font-semibold text-sm md:text-base truncate text-foreground/90">
                                                    {item.description || item.title}
                                                </p>
                                                <p className="text-xs md:text-sm text-muted-foreground truncate">
                                                    {item.createdBy?.name || 'System'} &bull; {item.title}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col lg:flex-row items-end lg:items-center gap-2 shrink-0">
                                            <span className="text-xs text-muted-foreground whitespace-nowrap hidden lg:inline-block">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-4 pt-4 border-t text-center hidden sm:block">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary text-sm" onClick={() => setActiveTab("incoming")}>
                                View all requests <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions / Tips Card */}
                <Card className="shadow-md border-muted/40 h-fit">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 md:space-y-3">
                        <Button variant="outline" className="w-full justify-start h-auto py-2.5 md:py-3" onClick={() => setActiveTab("incoming")}>
                            <div className="flex items-start gap-2 md:gap-3 text-left">
                                <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0"><CheckCircle className="h-4 w-4" /></div>
                                <div>
                                    <span className="font-semibold block text-sm">Review Requests</span>
                                    <span className="text-xs text-muted-foreground">Approve or deny pending visitors</span>
                                </div>
                            </div>
                        </Button>
                        {roleIncludes('book') && (
                            <Button variant="outline" className="w-full justify-start h-auto py-2.5 md:py-3" onClick={() => setActiveTab("book")}>
                                <div className="flex items-start gap-2 md:gap-3 text-left">
                                    <div className="bg-blue-500/10 p-2 rounded-lg text-blue-600 dark:text-blue-400 shrink-0"><BookOpen className="h-4 w-4" /></div>
                                    <div>
                                        <span className="font-semibold block text-sm">Book Appointment</span>
                                        <span className="text-xs text-muted-foreground">Schedule with higher authorities</span>
                                    </div>
                                </div>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
