import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/data-display";
import { CardHeader, CardTitle, CardDescription } from "@/components/data-display/card";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/input";
import { Button } from "@/components/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/overlay";
import { toast } from "@/components/ui/sonner";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "pa" | "guard";
  department?: string;
  status: "active" | "disabled";
}

interface UserTableProps {
  users: AdminUser[];
  search: string;
  onSearchChange: (value: string) => void;
  role: "all" | AdminUser["role"];
  onRoleChange: (value: "all" | AdminUser["role"]) => void;
  page: number;
  pageSize: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  total?: number;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onAddUser?: () => void;
  onEditUser?: (user: AdminUser) => void;
  onToggleActive?: (user: AdminUser) => Promise<void> | void;
  onResetPassword?: (user: AdminUser) => Promise<void> | void;
  onDeleteUser?: (user: AdminUser) => Promise<void> | void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  search,
  onSearchChange,
  role,
  onRoleChange,
  page,
  pageSize,
  onPrevPage,
  onNextPage,
  total,
  onSortChange,
  sortBy,
  sortOrder,
  onAddUser,
  onEditUser,
  onToggleActive,
  onResetPassword,
  onDeleteUser,
}) => {
  const totalCount = total ?? users.length;
  const canPrev = page > 1;
  const canNext = page * pageSize < totalCount;

  const columns = useMemo(() => [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status' },
  ], []);

  const handleHeaderClick = (key: string) => {
    if (!onSortChange) return;
    const nextOrder: 'asc' | 'desc' = sortBy === key ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
    onSortChange(key, nextOrder);
  };

  return (
    <Card className="border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>User Management</CardTitle>
          <div className="flex gap-2">
            <Button onClick={onAddUser}>Add User</Button>
          </div>
        </div>
        <CardDescription>Manage users, roles and access</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <Input
            placeholder="Search users (name, email, role)"
            value={search}
            onChange={(e: any) => onSearchChange(e.target.value)}
          />
          <Select value={role} onValueChange={(v: any) => onRoleChange(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="pa">PA</SelectItem>
              <SelectItem value="guard">Guard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="p-2 cursor-pointer select-none" onClick={() => handleHeaderClick(c.key)}>
                    <div className="inline-flex items-center gap-1">
                      <span>{c.label}</span>
                      {sortBy === c.key && (
                        <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="text-center border-t">
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.department || "-"}</td>
                  <td>{u.status}</td>
                  <td>
                    <Button size="sm" onClick={() => onEditUser && onEditUser(u)}>Edit</Button>
                    <Button size="sm" variant={u.status === 'active' ? 'destructive' : 'secondary'} className="ml-2" onClick={() => onToggleActive && onToggleActive(u)}>
                      {u.status === 'active' ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="secondary" className="ml-2" onClick={() => onResetPassword && onResetPassword(u)}>Reset Password</Button>
                    <Button size="sm" variant="destructive" className="ml-2" onClick={() => onDeleteUser && onDeleteUser(u)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-muted-foreground">{totalCount} users</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={!canPrev} onClick={onPrevPage}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={!canNext} onClick={onNextPage}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserTable;


