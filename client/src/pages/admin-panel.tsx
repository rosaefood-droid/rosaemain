import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Settings, TrendingUp } from "lucide-react";

export default function AdminPanel() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "Admin access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === 'admin',
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Access Denied - Admin Only</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-rosae-black">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <Shield className="mr-3 h-8 w-8 text-rosae-red" />
                Admin Panel
              </h1>
              <p className="text-gray-400">Manage users, roles, and system settings</p>
            </div>
          </div>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-rosae-dark-gray border-gray-600">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-white" data-testid="text-total-users">
                      {users?.length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Users className="text-blue-400 text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-rosae-dark-gray border-gray-600">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Admin Users</p>
                    <p className="text-3xl font-bold text-white" data-testid="text-admin-users">
                      {users?.filter((u: any) => u.role === 'admin').length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-rosae-red/20 rounded-lg flex items-center justify-center">
                    <Shield className="text-rosae-red text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-rosae-dark-gray border-gray-600">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Employees</p>
                    <p className="text-3xl font-bold text-white" data-testid="text-employee-users">
                      {users?.filter((u: any) => u.role === 'employee').length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-green-400 text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Management */}
          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                User Role Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isUsersLoading ? (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  Loading users...
                </div>
              ) : users && users.length > 0 ? (
                <div className="space-y-4">
                  {users.map((userData: any) => (
                    <div key={userData.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-4">
                        {userData.profileImageUrl ? (
                          <img 
                            src={userData.profileImageUrl} 
                            alt="User Avatar" 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-rosae-red/20 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-rosae-red" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">
                            {userData.firstName || userData.lastName ? 
                              `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : 
                              'Unknown User'
                            }
                          </p>
                          <p className="text-gray-400 text-sm">{userData.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge variant={userData.role === 'admin' ? 'destructive' : 'secondary'}>
                          {userData.role === 'admin' ? 'Admin' : 'Employee'}
                        </Badge>
                        
                        {userData.id !== user?.id && (
                          <Select
                            value={userData.role}
                            onValueChange={(role) => updateUserRoleMutation.mutate({ userId: userData.id, role })}
                          >
                            <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-700 border-gray-600">
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        {userData.id === user?.id && (
                          <span className="text-sm text-gray-400">(You)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Users Found</h3>
                  <p className="text-gray-400">No users have been registered yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}