import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookingModal } from "@/components/booking-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Users, IndianRupee, Search, X, Edit, Trash2, Phone, ChevronLeft, ChevronRight } from "lucide-react";

export default function Bookings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [deletingBooking, setDeletingBooking] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteComment, setDeleteComment] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [bookingDateFilter, setBookingDateFilter] = useState("");
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);

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

  const { data, isLoading: isBookingsLoading, refetch, error: bookingsError } = useQuery({
    queryKey: ["/api/bookings", currentPage, pageSize],
    queryFn: async () => {
      const response = await fetch(`/api/bookings?page=${currentPage}&pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
  });

  // Edit booking mutation
  const editBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return await apiRequest("PATCH", `/api/bookings/${editingBooking.id}`, bookingData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Booking updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setIsEditModalOpen(false);
      setEditingBooking(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  // Delete booking mutation
  const deleteBookingMutation = useMutation({
    mutationFn: async ({ bookingId, reason, comment }: { bookingId: string; reason: string; comment?: string }) => {
      return await apiRequest("DELETE", `/api/bookings/${bookingId}`, { reason, comment });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setIsDeleteModalOpen(false);
      setDeletingBooking(null);
      setDeleteReason("");
      setDeleteComment("");
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete booking",
        variant: "destructive",
      });
    },
  });
  
  // Apply filters whenever bookings data or filter values change
  useEffect(() => {
    // Check if data exists and has the bookings property
    if (!data || !data.bookings || !Array.isArray(data.bookings)) {
      setFilteredBookings([]);
      return;
    }
    
    let filtered = [...data.bookings];
    
    // Apply date filter (created date)
    if (dateFilter) {
      const dateToFilter = new Date(dateFilter).toDateString();
      filtered = filtered.filter(booking => {
        const createdDate = new Date(booking.createdAt).toDateString();
        return createdDate === dateToFilter;
      });
    }
    
    // Apply phone number filter
    if (phoneFilter) {
      filtered = filtered.filter(booking => 
        booking.phoneNumber && booking.phoneNumber.includes(phoneFilter)
      );
    }
    
    // Apply booking date filter
    if (bookingDateFilter) {
      filtered = filtered.filter(booking => 
        booking.bookingDate === bookingDateFilter
      );
    }
    
    setFilteredBookings(filtered);
  }, [data, dateFilter, phoneFilter, bookingDateFilter]);

  // Handle booking errors
  useEffect(() => {
    if (bookingsError && isUnauthorizedError(bookingsError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [bookingsError, toast]);

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

  const getPaymentStatus = (totalAmount: number) => {
    return totalAmount <= 750 ? 'partial' : 'full';
  };

  const handleEditBooking = (booking: any) => {
    setEditingBooking(booking);
    setIsEditModalOpen(true);
  };

  const handleDeleteBooking = (booking: any) => {
    setDeletingBooking(booking);
    setIsDeleteModalOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const totalPages = data?.pagination?.totalPages || 0;
  const currentBookings = data?.bookings || [];

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
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
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Input
              type="date"
              placeholder="Filter by date"
              className="bg-gray-800 border-gray-600 text-white pr-10"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              data-testid="input-date-filter"
            />
            {dateFilter && (
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setDateFilter("")}
                data-testid="button-clear-date-filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs text-gray-400 mt-1 block">Filter by created date</span>
          </div>
          
          <div className="relative">
            <Input
              type="text"
              placeholder="Filter by phone number"
              className="bg-gray-800 border-gray-600 text-white pr-10"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              data-testid="input-phone-filter"
            />
            {phoneFilter && (
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setPhoneFilter("")}
                data-testid="button-clear-phone-filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs text-gray-400 mt-1 block">Filter by phone number</span>
          </div>
          
          <div className="relative">
            <Input
              type="date"
              placeholder="Filter by booking date"
              className="bg-gray-800 border-gray-600 text-white pr-10"
              value={bookingDateFilter}
              onChange={(e) => setBookingDateFilter(e.target.value)}
              data-testid="input-booking-date-filter"
            />
            {bookingDateFilter && (
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setBookingDateFilter("")}
                data-testid="button-clear-booking-date-filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs text-gray-400 mt-1 block">Filter by booking date</span>
          </div>
        </div>

        <Card className="bg-rosae-dark-gray border-gray-600">
          <CardContent className="p-6">
            {isBookingsLoading ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                Loading bookings...
              </div>
            ) : currentBookings && currentBookings.length > 0 ? (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 text-sm border-b border-gray-600">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Theatre</th>
                        <th className="pb-3">Time Slot</th>
                        <th className="pb-3">Guests</th>
                        <th className="pb-3">Phone</th>
                        <th className="pb-3">Total Amount</th>
                        <th className="pb-3">Cash</th>
                        <th className="pb-3">UPI</th>
                        <th className="pb-3">Payment Status</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-white">
                      {currentBookings.map((booking: any) => {
                        const paymentStatus = getPaymentStatus(Number(booking.totalAmount));
                        return (
                        <tr key={booking.id} className="border-b border-gray-700 hover:bg-gray-800/30 transition-colors" data-testid={`row-booking-${booking.id}`}>
                          <td className="py-4">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm">{formatDate(booking.bookingDate)}</span>
                            </div>
                          </td>
                          <td className="py-4 font-medium">{booking.theatreName}</td>
                          <td className="py-4 text-gray-300 text-sm">{booking.timeSlot}</td>
                          <td className="py-4">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="font-medium">{booking.guests}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm">{booking.phoneNumber || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-4 font-semibold">
                            <div className="flex items-center">
                              <IndianRupee className="w-4 h-4 text-rosae-red mr-1" />
                              <span className="text-lg">{formatCurrency(Number(booking.totalAmount))}</span>
                            </div>
                          </td>
                          <td className="py-4 text-green-400 font-medium">{formatCurrency(Number(booking.cashAmount))}</td>
                          <td className="py-4 text-purple-400 font-medium">{formatCurrency(Number(booking.upiAmount))}</td>
                          <td className="py-4">
                            <Badge className={paymentStatus === 'full'
                              ? 'bg-green-600/20 text-green-400 border-green-600/30'
                              : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
                            }>
                              {paymentStatus === 'full' ? 'Full Payment' : 'Partial Payment'}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditBooking(booking)}
                                className="border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
                                data-testid={`button-edit-${booking.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteBooking(booking)}
                                className="border-red-600/50 text-red-400 hover:bg-red-600/20"
                                data-testid={`button-delete-${booking.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between py-4">
                    <div className="text-sm text-gray-400">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data?.pagination?.total || 0)} of {data?.pagination?.total || 0} bookings
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={pageNum === currentPage ? "default" : "outline"}
                            onClick={() => handlePageChange(pageNum)}
                            className={pageNum === currentPage 
                              ? "bg-rosae-red hover:bg-rosae-dark-red" 
                              : "border-gray-600 text-gray-300 hover:bg-gray-700"
                            }
                            data-testid={`button-page-${pageNum}`}
                          >
                            {pageNum}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : data && data.bookings && Array.isArray(data.bookings) && data.bookings.length > 0 && currentBookings.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Matching Bookings</h3>
                <p className="text-gray-400 mb-6">Try adjusting your filters</p>
                <Button 
                  onClick={() => {
                    setDateFilter("");
                    setPhoneFilter("");
                    setBookingDateFilter("");
                  }}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  data-testid="button-clear-filters"
                >
                  Clear All Filters
                </Button>
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

        {/* Edit Booking Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="bg-rosae-dark-gray border-gray-600 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Booking</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update booking details for {editingBooking?.theatreName}
              </DialogDescription>
            </DialogHeader>
            
            {editingBooking && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Number of Guests</label>
                  <Input
                    type="number"
                    value={editingBooking.guests}
                    onChange={(e) => setEditingBooking({
                      ...editingBooking,
                      guests: parseInt(e.target.value) || 1
                    })}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    data-testid="input-edit-guests"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300">Phone Number</label>
                  <Input
                    type="tel"
                    value={editingBooking.phoneNumber || ''}
                    onChange={(e) => setEditingBooking({
                      ...editingBooking,
                      phoneNumber: e.target.value
                    })}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    data-testid="input-edit-phone"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300">Cash Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingBooking.cashAmount}
                    onChange={(e) => {
                      const cashAmount = parseFloat(e.target.value) || 0;
                      const upiAmount = Math.max(0, editingBooking.totalAmount - cashAmount);
                      setEditingBooking({
                        ...editingBooking,
                        cashAmount,
                        upiAmount
                      });
                    }}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    data-testid="input-edit-cash"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300">UPI Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingBooking.upiAmount}
                    onChange={(e) => {
                      const upiAmount = parseFloat(e.target.value) || 0;
                      const cashAmount = Math.max(0, editingBooking.totalAmount - upiAmount);
                      setEditingBooking({
                        ...editingBooking,
                        upiAmount,
                        cashAmount
                      });
                    }}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    data-testid="input-edit-upi"
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={() => editBookingMutation.mutate(editingBooking)}
                disabled={editBookingMutation.isPending}
                className="bg-rosae-red hover:bg-rosae-dark-red"
                data-testid="button-save-edit"
              >
                {editBookingMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Booking Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="bg-rosae-dark-gray border-gray-600 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Booking</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete this booking? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Reason for deletion *</label>
                <Select value={deleteReason} onValueChange={setDeleteReason}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1" data-testid="select-delete-reason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="Cancellation">Cancellation</SelectItem>
                    <SelectItem value="Reschedule">Reschedule</SelectItem>
                    <SelectItem value="By mistake">By mistake</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">Additional comments (optional)</label>
                <Textarea
                  value={deleteComment}
                  onChange={(e) => setDeleteComment(e.target.value)}
                  placeholder="Add any additional details..."
                  className="bg-gray-800 border-gray-600 text-white mt-1 resize-none"
                  rows={3}
                  data-testid="textarea-delete-comment"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteReason('');
                  setDeleteComment('');
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteBookingMutation.mutate({ 
                  bookingId: deletingBooking.id, 
                  reason: deleteReason, 
                  comment: deleteComment 
                })}
                disabled={!deleteReason || deleteBookingMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete"
              >
                {deleteBookingMutation.isPending ? 'Deleting...' : 'Delete Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
