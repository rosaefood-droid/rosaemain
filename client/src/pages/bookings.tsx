import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/booking-modal";
import { Plus, Calendar, Users, IndianRupee } from "lucide-react";

export default function Bookings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

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

  const { data: bookings, isLoading: isBookingsLoading, refetch } = useQuery({
    queryKey: ["/api/bookings"],
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-page-title">All Bookings</h2>
            <p className="text-gray-400">Manage and view all theatre bookings</p>
          </div>
          <Button 
            onClick={() => setIsBookingModalOpen(true)}
            className="bg-rosae-red hover:bg-rosae-dark-red px-6 py-2"
            data-testid="button-new-booking"
          >
            <Plus className="mr-2 w-4 h-4" />
            New Booking
          </Button>
        </div>

        <Card className="bg-rosae-dark-gray border-gray-600">
          <CardContent className="p-6">
            {isBookingsLoading ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                Loading bookings...
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-600">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Theatre</th>
                      <th className="pb-3">Time Slot</th>
                      <th className="pb-3">Guests</th>
                      <th className="pb-3">Total Amount</th>
                      <th className="pb-3">Cash</th>
                      <th className="pb-3">UPI</th>
                      <th className="pb-3">Snacks</th>
                      <th className="pb-3">Payment Type</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {bookings.map((booking: any) => (
                      <tr key={booking.id} className="border-b border-gray-700 hover:bg-gray-800/50" data-testid={`row-booking-${booking.id}`}>
                        <td className="py-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            {formatDate(booking.bookingDate)}
                          </div>
                        </td>
                        <td className="py-4 font-medium">{booking.theatreName}</td>
                        <td className="py-4 text-gray-300">{booking.timeSlot}</td>
                        <td className="py-4">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 text-gray-400 mr-2" />
                            {booking.guests}
                          </div>
                        </td>
                        <td className="py-4 font-semibold">
                          <div className="flex items-center">
                            <IndianRupee className="w-4 h-4 text-rosae-red mr-1" />
                            {formatCurrency(Number(booking.totalAmount))}
                          </div>
                        </td>
                        <td className="py-4 text-green-400">{formatCurrency(Number(booking.cashAmount))}</td>
                        <td className="py-4 text-purple-400">{formatCurrency(Number(booking.upiAmount))}</td>
                        <td className="py-4 text-orange-400">{formatCurrency(Number(booking.snacksAmount))}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            Number(booking.cashAmount) > 0 && Number(booking.upiAmount) > 0 
                              ? 'bg-blue-600/20 text-blue-400' 
                              : Number(booking.cashAmount) > 0 
                              ? 'bg-green-600/20 text-green-400' 
                              : 'bg-purple-600/20 text-purple-400'
                          }`}>
                            {Number(booking.cashAmount) > 0 && Number(booking.upiAmount) > 0 ? 'Mixed' : 
                             Number(booking.cashAmount) > 0 ? 'Cash' : 'UPI'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Bookings Found</h3>
                <p className="text-gray-400 mb-6">Start by creating your first theatre booking</p>
                <Button 
                  onClick={() => setIsBookingModalOpen(true)}
                  className="bg-rosae-red hover:bg-rosae-dark-red"
                  data-testid="button-create-first-booking"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Create First Booking
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <BookingModal 
          isOpen={isBookingModalOpen} 
          onClose={() => setIsBookingModalOpen(false)}
          onSuccess={() => {
            refetch();
            setIsBookingModalOpen(false);
          }}
        />
      </div>
    </Layout>
  );
}
