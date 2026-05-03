import { useState, useEffect } from "react";
import { Button } from "@/components/input/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/card";
import { Input } from "@/components/input/input";
import { Label } from "@/components/input/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/input/select";
import { Badge } from "@/components/data-display/badge";
import { Users, Edit, Trash2, Plus, Search, Shield, UserCog, HardHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { Pagination } from "@/components/common/Pagination";

interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "staff" | "security" | "visitor";
    department?: string;
    status: "active" | "inactive";
    lastLogin?: string;
    username?: string;
    password?: string;
    // Guard specific fields
    assignedGate?: string;
    shift?: string;
    joinDate?: string;
}

export const UserManagement = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(10);

    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({});

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filters change
    }, [searchTerm, roleFilter, statusFilter]);

    useEffect(() => {
        fetchUsers();
    }, [currentPage, searchTerm, roleFilter, statusFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await apiService.getUsers({
                page: currentPage,
                pageSize: pageSize,
                q: searchTerm,
                role: roleFilter !== 'all' ? roleFilter as any : undefined,
                status: statusFilter !== 'all' ? statusFilter as any : undefined,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });

            const rawList = Array.isArray(response) ? response : (response?.items || []);
            const total = (response as any).total || rawList.length;

            const userList = rawList.map((u: any) => ({
                id: u._id || u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                department: u.department,
                status: (u.isActive !== false ? 'active' : 'inactive') as 'active' | 'inactive',
                lastLogin: u.lastLogin,
                assignedGate: u.assignedGate,
                shift: u.shift,
                joinDate: u.joinDate
            }));

            setUsers(userList);
            // If backend returns total items, calculate pages. Else assume 1 page or client-side logic (not ideal but fallback)
            setTotalPages(Math.max(1, Math.ceil(total / pageSize)));

        } catch (error: any) {
            console.error("Failed to fetch users:", error);
            toast({
                title: "Error",
                description: "Failed to load users",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = () => {
        setFormData({
            role: "staff",
            status: "active",
        });
        setEditingUser(null);
        setShowForm(true);
    };

    const handleEditUser = (user: User) => {
        setFormData({
            ...user,
            password: "" // Don't populate password
        } as any);
        setEditingUser(user);
        setShowForm(true);
    };

    const handleSaveUser = async () => {
        if (!formData.name || !formData.email || !formData.role) {
            toast({
                title: "Validation Error",
                description: "Name, email, and role are required",
                variant: "destructive",
            });
            return;
        }

        try {
            const payload: any = { ...formData };

            // Password handling
            if (!editingUser) {
                // For new users, use provided password or default
                if (!payload.password) payload.password = 'Password@123';
            } else {
                // For existing users, only send password if provided (change password)
                if (!payload.password) delete payload.password;
            }

            if (editingUser) {
                await apiService.updateUser(editingUser.id, payload);
                toast({ title: "User Updated", description: "User details updated successfully" });
            } else {
                // Use provided username or fallback
                const username = formData.username || formData.email?.split('@')[0] || 'user';
                await apiService.createUser({ ...payload, username } as any);
                toast({ title: "User Created", description: "New user created successfully" });
            }
            setShowForm(false);
            setFormData({});
            setEditingUser(null);
            fetchUsers();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save user",
                variant: "destructive",
            });
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (window.confirm("Are you sure you want to deactivate this user?")) {
            try {
                await apiService.deleteUser(id);
                toast({ title: "User Deleted", description: "User has been removed" });
                fetchUsers();
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: "Failed to delete user",
                    variant: "destructive",
                });
            }
        }
    };

    // Backend now handles filtering, so we use the full users list
    const filteredUsers = users;

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin":
                return <Badge className="bg-destructive/10 text-destructive">Admin</Badge>;
            case "security":
                return <Badge className="bg-warning/10 text-warning">Security</Badge>;
            case "staff":
                return <Badge className="bg-primary/10 text-primary">Staff</Badge>;
            case "visitor":
                return <Badge className="bg-muted text-muted-foreground">Visitor</Badge>;
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <Shield className="h-4 w-4" />;
            case 'staff': return <Users className="h-4 w-4" />;
            case 'security': return <HardHat className="h-4 w-4" />;
            default: return <UserCog className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="security">Security</SelectItem>
                            <SelectItem value="visitor">Visitor</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="disabled">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button className="gradient-primary" onClick={handleAddUser}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </div>
            </div>

            {showForm && (
                <Card className="gradient-card shadow-soft border-primary/50 mb-6">
                    <CardHeader>
                        <CardTitle>{editingUser ? "Edit User" : "Add New User"}</CardTitle>
                        <CardDescription>Enter user details and role assignment</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Full Name *</Label>
                                <Input
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email Address *</Label>
                                <Input
                                    type="email"
                                    value={formData.email || ""}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@university.edu"
                                    autoComplete="off"
                                // disabled={!!editingUser} // Prevent email change for existing users if desired
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role *</Label>
                                <Select
                                    value={formData.role || "staff"}
                                    onValueChange={(val: any) => setFormData({ ...formData, role: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                        <SelectItem value="staff">Staff Member</SelectItem>
                                        <SelectItem value="security">Security Guard</SelectItem>
                                        {/* <SelectItem value="visitor">Visitor</SelectItem> */}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Username *</Label>
                                <Input
                                    value={formData.username || ""}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="jdoe"
                                    autoComplete="off"
                                // disabled={!!editingUser}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{editingUser ? "New Password (Optional)" : "Password *"}</Label>
                                <Input
                                    type="password"
                                    value={formData.password || ""}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={editingUser ? "Leave blank to keep current" : "Min 8 characters"}
                                    autoComplete="new-password"
                                />
                            </div>

                            {/* Guard Specific Fields */}
                            {formData.role === 'security' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Assigned Gate</Label>
                                        <Select
                                            value={formData.assignedGate || "Main Gate"}
                                            onValueChange={(val) => setFormData({ ...formData, assignedGate: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Gate" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Main Gate">Main Gate</SelectItem>
                                                <SelectItem value="Back Gate">Back Gate</SelectItem>
                                                <SelectItem value="Block A Entrance">Block A Entrance</SelectItem>
                                                <SelectItem value="Library">Library</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Shift</Label>
                                        <Select
                                            value={formData.shift || "morning"}
                                            onValueChange={(val) => setFormData({ ...formData, shift: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Shift" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="morning">Morning (6AM - 2PM)</SelectItem>
                                                <SelectItem value="afternoon">Afternoon (2PM - 10PM)</SelectItem>
                                                <SelectItem value="night">Night (10PM - 6AM)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <Label>Department (Optional)</Label>
                                <Input
                                    value={formData.department || ""}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    placeholder="e.g. Computer Science"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => { setShowForm(false); setEditingUser(null); }}>
                                Cancel
                            </Button>
                            <Button className="gradient-primary" onClick={handleSaveUser}>
                                {editingUser ? "Update User" : "Create User"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="gradient-card shadow-soft">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No users found matching your criteria</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-3 text-left font-medium">User</th>
                                        <th className="px-4 py-3 text-left font-medium">Role</th>
                                        <th className="px-4 py-3 text-left font-medium">Department</th>
                                        <th className="px-4 py-3 text-left font-medium">Status</th>
                                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {getRoleIcon(user.role)}
                                                    {getRoleBadge(user.role)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {user.department || "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={user.status === 'active' ? 'secondary' : 'outline'} className={user.status === 'active' ? "bg-success/10 text-success" : "text-muted-foreground"}>
                                                    {user.status === 'active' ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => handleEditUser(user)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end mt-4">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div >
    );
};
