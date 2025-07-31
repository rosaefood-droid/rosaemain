import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, User, Clock } from "lucide-react";

export default function UserManagement() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="bg-rosae-dark-gray border-gray-600 max-w-md">
              <CardContent className="p-8 text-center">
                <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Access Restricted</h3>
                <p className="text-gray-400">
                  You need administrator privileges to access user management features.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-page-title">User Management</h2>
            <p className="text-gray-400">Manage users and their access permissions</p>
          </div>
        </div>

        {/* Current User Info */}
        <Card className="bg-rosae-dark-gray border-gray-600 mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center" data-testid="text-current-user-title">
              <User className="w-5 h-5 mr-2 text-rosae-red" />
              Current User Information
            </h3>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center space-x-4">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full object-cover"
                    data-testid="img-profile-picture"
                  />
                ) : (
                  <div className="w-16 h-16 bg-rosae-red/20 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-rosae-red" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-xl font-semibold text-white" data-testid="text-user-name">
                      {user?.firstName || user?.lastName ? 
                        `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
                        'User'
                      }
                    </h4>
                    <Badge className="bg-rosae-red/20 text-rosae-red">
                      {user?.role === 'admin' ? 'Administrator' : 'Employee'}
                    </Badge>
                  </div>
                  <p className="text-gray-400 mb-1" data-testid="text-user-email">{user?.email || 'No email provided'}</p>
                  <p className="text-gray-500 text-sm" data-testid="text-user-id">User ID: {user?.id}</p>
                  {user?.createdAt && (
                    <p className="text-gray-500 text-sm mt-2">
                      <Clock className="inline w-4 h-4 mr-1" />
                      Joined: {formatDate(user.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-rosae-red mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">User Accounts</h3>
              <p className="text-gray-400 text-sm mb-4">
                Manage user accounts and their access levels using Replit's authentication system.
              </p>
              <p className="text-rosae-red text-sm">
                Users are automatically created when they sign in via Replit Auth
              </p>
            </CardContent>
          </Card>

          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6 text-center">
              <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Role Management</h3>
              <p className="text-gray-400 text-sm mb-4">
                Control user permissions with role-based access control.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Admin:</span>
                  <span className="text-white">Full Access</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Employee:</span>
                  <span className="text-white">Limited Access</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6 text-center">
              <Clock className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Activity Tracking</h3>
              <p className="text-gray-400 text-sm mb-4">
                Monitor user activities and maintain audit logs for security.
              </p>
              <p className="text-green-400 text-sm">
                All user actions are automatically logged
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Capabilities */}
        <Card className="bg-rosae-dark-gray border-gray-600">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center" data-testid="text-admin-capabilities-title">
              <Shield className="w-5 h-5 mr-2 text-rosae-red" />
              Administrator Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">System Access</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    View all theatre bookings and analytics
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    Manage expense tracking and reports
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    Approve/reject leave applications
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    Access user management features
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Data Management</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Export data for reporting purposes
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Import historical data via Excel
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Monitor system activity logs
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Configure system settings
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication Info */}
        <Card className="bg-rosae-dark-gray border-gray-600 mt-6">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Authentication & Security</h3>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-3">
                <strong>Authentication System:</strong> This application uses Replit's secure authentication system.
              </p>
              <p className="text-gray-300 text-sm mb-3">
                <strong>User Registration:</strong> New users are automatically created when they sign in for the first time.
              </p>
              <p className="text-gray-300 text-sm">
                <strong>Security:</strong> All user sessions are managed securely with proper encryption and session management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
