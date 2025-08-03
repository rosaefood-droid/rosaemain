import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Plus, X, Theatre, Clock } from "lucide-react";

interface Config {
  theatres: string[];
  timeSlots: string[];
}

export default function Configuration() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [newTheatre, setNewTheatre] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('');

  // Redirect to home if not authenticated or not admin
  if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Access Denied - Admin Only</div>
      </div>
    );
  }

  const { data: config, isLoading: isConfigLoading } = useQuery<Config>({
    queryKey: ["/api/config"],
    enabled: user?.role === 'admin',
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Config) => {
      return await apiRequest("POST", `/api/config`, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({
        title: "Configuration updated",
        description: "Theatre and time slot settings have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const handleAddTheatre = () => {
    if (!newTheatre.trim()) {
      toast({
        title: "Error",
        description: "Please enter a theatre name",
        variant: "destructive",
      });
      return;
    }

    if (config) {
      const updatedConfig = {
        ...config,
        theatres: [...config.theatres, newTheatre.trim()]
      };
      updateConfigMutation.mutate(updatedConfig);
      setNewTheatre('');
    }
  };

  const handleAddTimeSlot = () => {
    if (!newTimeSlot.trim()) {
      toast({
        title: "Error",
        description: "Please enter a time slot",
        variant: "destructive",
      });
      return;
    }

    if (config) {
      const updatedConfig = {
        ...config,
        timeSlots: [...config.timeSlots, newTimeSlot.trim()]
      };
      updateConfigMutation.mutate(updatedConfig);
      setNewTimeSlot('');
    }
  };

  const handleRemoveTheatre = (theatre: string) => {
    if (config) {
      const updatedConfig = {
        ...config,
        theatres: config.theatres.filter(t => t !== theatre)
      };
      updateConfigMutation.mutate(updatedConfig);
    }
  };

  const handleRemoveTimeSlot = (timeSlot: string) => {
    if (config) {
      const updatedConfig = {
        ...config,
        timeSlots: config.timeSlots.filter(t => t !== timeSlot)
      };
      updateConfigMutation.mutate(updatedConfig);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
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
                <Settings className="mr-3 h-8 w-8 text-blue-400" />
                System Configuration
              </h1>
              <p className="text-gray-400">Manage theatres and time slots for bookings</p>
            </div>
          </div>

          {isConfigLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">Loading configuration...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Theatre Management */}
              <Card className="bg-rosae-dark-gray border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Theatre className="w-5 h-5 mr-2 text-blue-400" />
                    Theatre Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter theatre name (e.g., Screen 1)"
                      value={newTheatre}
                      onChange={(e) => setNewTheatre(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <Button
                      onClick={handleAddTheatre}
                      disabled={updateConfigMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {config?.theatres.map((theatre, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <span className="text-white">{theatre}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveTheatre(theatre)}
                          className="border-red-600 text-red-400 hover:bg-red-600/20"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Time Slot Management */}
              <Card className="bg-rosae-dark-gray border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-green-400" />
                    Time Slot Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter time slot (e.g., 10:00 AM - 12:00 PM)"
                      value={newTimeSlot}
                      onChange={(e) => setNewTimeSlot(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <Button
                      onClick={handleAddTimeSlot}
                      disabled={updateConfigMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {config?.timeSlots.map((timeSlot, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <span className="text-white">{timeSlot}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveTimeSlot(timeSlot)}
                          className="border-red-600 text-red-400 hover:bg-red-600/20"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Information Alert */}
          <Card className="bg-rosae-dark-gray border-gray-600 mt-8">
            <CardContent className="p-6">
              <Alert className="border-blue-600 bg-blue-600/10">
                <Settings className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  <strong>Configuration Updates:</strong> Any changes you make here will immediately be reflected in the booking form. 
                  New theatres and time slots will be available for selection when creating bookings.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 