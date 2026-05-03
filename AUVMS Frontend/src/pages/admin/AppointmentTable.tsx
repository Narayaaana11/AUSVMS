import React from "react";
import { Card, CardContent } from "@/components/data-display";
import { CardHeader, CardTitle, CardDescription } from "@/components/data-display/card";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/input";
import { Button } from "@/components/input";

export interface AdminAppointment {
  id: string;
  visitorName: string;
  staffName: string;
  purpose: string;
  status: "pending" | "approved" | "denied" | "completed";
  date: string;
}

interface AppointmentTableProps {
  items: AdminAppointment[];
  search: string;
  onSearchChange: (v: string) => void;
  status: "all" | AdminAppointment["status"];
  onStatusChange: (v: "all" | AdminAppointment["status"]) => void;
  page: number;
  pageSize: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onApprove?: (id: string) => void;
  onDeny?: (id: string) => void;
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  items,
  search,
  onSearchChange,
  status,
  onStatusChange,
  page,
  pageSize,
  onPrevPage,
  onNextPage,
  onApprove,
  onDeny,
}) => {
  return (
    <Card className="border">
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
        <CardDescription>Review and manage appointments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <Input placeholder="Search appointments" value={search} onChange={(e: any) => onSearchChange(e.target.value)} />
          <Select value={status} onValueChange={(v: any) => onStatusChange(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="p-2">Visitor</th>
                <th className="p-2">Staff</th>
                <th className="p-2">Purpose</th>
                <th className="p-2">Date</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="text-center border-t">
                  <td>{a.visitorName}</td>
                  <td>{a.staffName}</td>
                  <td>{a.purpose}</td>
                  <td>{a.date}</td>
                  <td>{a.status}</td>
                  <td>
                    <Button size="sm" onClick={() => onApprove?.(a.id)}>Approve</Button>
                    <Button size="sm" variant="destructive" className="ml-2" onClick={() => onDeny?.(a.id)}>Deny</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-muted-foreground">{items.length} appointments</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={onPrevPage}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={page * pageSize >= items.length} onClick={onNextPage}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentTable;


