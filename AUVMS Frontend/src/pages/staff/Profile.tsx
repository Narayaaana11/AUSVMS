import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/input/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/card";
import { Avatar, AvatarFallback } from "@/components/data-display/avatar";
import { Input } from "@/components/input/input";
import { Label } from "@/components/input/label";
import { apiService } from "@/services/apiService";
import { useToast } from "@/hooks/use-toast";

interface ProfileProps {
    user: any;
}

export const Profile: React.FC<ProfileProps> = ({ user }) => {
    const { toast } = useToast();
    const [profileData, setProfileData] = useState<any>(user);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch full user profile on component mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setIsLoading(true);
                const response = await apiService.getUserProfile();
                if (response) {
                    setProfileData(response);
                } else {
                    setProfileData(user);
                }
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
                // Fallback to user from context
                setProfileData(user);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, [user]);

    const profileForm = useForm({
        defaultValues: {
            fullName: profileData?.name || profileData?.username || "",
            email: profileData?.email || "",
            phone: profileData?.phone || "",
            department: profileData?.department || "",
            position: profileData?.designation || "",
            employeeId: profileData?.employeeId || "",
        },
    });

    // Update form when profile data changes
    useEffect(() => {
        profileForm.reset({
            fullName: profileData?.name || profileData?.username || "",
            email: profileData?.email || "",
            phone: profileData?.phone || "",
            department: profileData?.department || "",
            position: profileData?.designation || "",
            employeeId: profileData?.employeeId || "",
        });
    }, [profileData, profileForm]);

    const onProfileSubmit = profileForm.handleSubmit(async (values) => {
        try {
            // Map frontend field names to backend field names
            await apiService.updateProfile({
                name: values.fullName,
                email: values.email,
                phone: values.phone,
                department: values.department,
                designation: values.position,
                employeeId: values.employeeId,
            });
            toast({ title: "Success", description: "Profile updated." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
        }
    });

    return (
        <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto">
            <Card className="shadow-lg border-muted/40">
                <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Profile Information</CardTitle>
                    <CardDescription className="text-sm">Manage your personal information and account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                        <Avatar className="h-16 w-16 md:h-20 md:w-20 shrink-0">
                            <AvatarFallback className="text-base md:text-lg">{profileData?.username?.charAt(0).toUpperCase() || "S"}</AvatarFallback>
                        </Avatar>
                        <div className="text-center sm:text-left">
                            <h3 className="text-base md:text-lg font-semibold">{profileData?.username || "Staff Member"}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">{profileData?.department || "Department"}</p>
                            <p className="text-sm text-muted-foreground">Role: {profileData?.role || "Staff"}</p>
                        </div>
                    </div>

                    <form onSubmit={onProfileSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-3 md:space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                                    <Input id="fullName" className="w-full h-10" {...profileForm.register("fullName")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                                    <Input id="email" type="email" className="w-full h-10" {...profileForm.register("email")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                                    <Input id="phone" className="w-full h-10" {...profileForm.register("phone")} />
                                </div>
                            </div>
                            <div className="space-y-3 md:space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                                    <Input id="department" className="w-full h-10" {...profileForm.register("department")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="position" className="text-sm font-medium">Position</Label>
                                    <Input id="position" className="w-full h-10" {...profileForm.register("position")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="employeeId" className="text-sm font-medium">Employee ID</Label>
                                    <Input id="employeeId" className="w-full h-10" {...profileForm.register("employeeId")} />
                                </div>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
