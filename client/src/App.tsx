import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Bookings from "@/pages/bookings";
import Analytics from "@/pages/analytics";
import Expenses from "@/pages/expenses";
import LeaveManagement from "@/pages/leave-management";
import UserManagement from "@/pages/user-management";
import AdminPanel from "@/pages/admin-panel";
import Configuration from "@/pages/configuration";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-lg">Loading ROSAE Theatre Management...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/leave-management" component={LeaveManagement} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/admin-panel" component={AdminPanel} />
      <Route path="/configuration" component={Configuration} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
