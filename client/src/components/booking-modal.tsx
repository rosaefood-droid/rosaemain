import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save } from "lucide-react";
import { insertBookingSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Default options (fallback if config is not loaded)
const DEFAULT_THEATRE_OPTIONS = [
  "Screen 1",
  "Screen 2", 
  "Screen 3",
  "VIP Screen"
];

const DEFAULT_TIME_SLOTS = [
  "2:30 PM",
  "5:00 PM",
  "8:15 PM", 
  "11:00 PM"
];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BookingModal({ isOpen, onClose, onSuccess }: BookingModalProps) {
  const { toast } = useToast();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fetch configuration for theatres and time slots
  const { data: config } = useQuery({
    queryKey: ["/api/config"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use config data or fallback to defaults
  const theatreOptions = config?.theatres || DEFAULT_THEATRE_OPTIONS;
  const timeSlots = config?.timeSlots || DEFAULT_TIME_SLOTS;

  const form = useForm({
    resolver: zodResolver(insertBookingSchema.extend({
      totalAmount: insertBookingSchema.shape.totalAmount.refine(val => Number(val) > 0, "Total amount must be greater than 0"),
      cashAmount: insertBookingSchema.shape.cashAmount.refine(val => Number(val) >= 0, "Cash amount cannot be negative"),
      upiAmount: insertBookingSchema.shape.upiAmount.refine(val => Number(val) >= 0, "UPI amount cannot be negative"),
      snacksAmount: insertBookingSchema.shape.snacksAmount.refine(val => Number(val) >= 0, "Snacks amount cannot be negative"),
      snacksCash: insertBookingSchema.shape.snacksCash.refine(val => Number(val) >= 0, "Snacks cash cannot be negative"),
      snacksUpi: insertBookingSchema.shape.snacksUpi.refine(val => Number(val) >= 0, "Snacks UPI cannot be negative"),
    })),
    defaultValues: {
      theatreName: "",
      timeSlot: "",
      guests: "1",
      totalAmount: "",
      cashAmount: "0",
      upiAmount: "0", 
      snacksAmount: "0",
      snacksCash: "0",
      snacksUpi: "0",
      bookingDate: new Date().toISOString().split('T')[0],
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/daily-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/time-slots"] });
      form.reset();
      onSuccess?.();
      onClose();
    },
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
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  const validateAmounts = () => {
    const values = form.getValues();
    const errors: string[] = [];

    const totalAmount = Number(values.totalAmount) || 0;
    const cashAmount = Number(values.cashAmount) || 0;
    const upiAmount = Number(values.upiAmount) || 0;
    const snacksAmount = Number(values.snacksAmount) || 0;
    const snacksCash = Number(values.snacksCash) || 0;
    const snacksUpi = Number(values.snacksUpi) || 0;

    // Validate main payment amounts
    if (Math.abs((cashAmount + upiAmount) - totalAmount) > 0.01) {
      errors.push("Cash + UPI must equal total amount");
    }

    // Validate snacks payment amounts  
    if (snacksAmount > 0 && Math.abs((snacksCash + snacksUpi) - snacksAmount) > 0.01) {
      errors.push("Snacks cash + UPI must equal snacks amount");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const onSubmit = (data: any) => {
    if (!validateAmounts()) {
      return;
    }
    createBookingMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setValidationErrors([]);
    onClose();
  };

  // Auto-calculate UPI when total or cash changes
  const handleTotalOrCashChange = () => {
    const totalAmount = Number(form.getValues("totalAmount")) || 0;
    const cashAmount = Number(form.getValues("cashAmount")) || 0;
    const calculatedUpi = Math.max(0, totalAmount - cashAmount);
    form.setValue("upiAmount", calculatedUpi.toString());
    validateAmounts();
  };

  // Auto-calculate snacks UPI when snacks total or cash changes
  const handleSnacksChange = () => {
    const snacksAmount = Number(form.getValues("snacksAmount")) || 0;
    const snacksCash = Number(form.getValues("snacksCash")) || 0;
    const calculatedSnacksUpi = Math.max(0, snacksAmount - snacksCash);
    form.setValue("snacksUpi", calculatedSnacksUpi.toString());
    validateAmounts();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-rosae-dark-gray border-gray-600 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            New Theatre Booking
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="theatreName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Theatre Name</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-theatre-name">
                          <SelectValue placeholder="Select theatre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {theatreOptions.map((theatre) => (
                          <SelectItem key={theatre} value={theatre}>
                            {theatre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeSlot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Time Slot</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-time-slot">
                          <SelectValue placeholder="Select time slot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Number of Guests</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="4"
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-guests"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bookingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Booking Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-booking-date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Total Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="1200"
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-total-amount"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setTimeout(handleTotalOrCashChange, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cashAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Amount Paid (Cash)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="800"
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-cash-amount"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setTimeout(handleTotalOrCashChange, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="upiAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Amount Paid (UPI)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="400"
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-upi-amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t border-gray-600 pt-6">
              <h4 className="text-lg font-semibold text-white mb-4">Snacks Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="snacksAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Snacks Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="300"
                          className="bg-gray-800 border-gray-600 text-white"
                          data-testid="input-snacks-amount"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setTimeout(handleSnacksChange, 0);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="snacksCash"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Snacks Cash</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="200"
                          className="bg-gray-800 border-gray-600 text-white"
                          data-testid="input-snacks-cash"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setTimeout(handleSnacksChange, 0);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="snacksUpi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Snacks UPI</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="100"
                          className="bg-gray-800 border-gray-600 text-white"
                          data-testid="input-snacks-upi"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-600">
              <div className="text-sm">
                {validationErrors.length > 0 && (
                  <div className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <p key={index} className="text-rosae-red" data-testid="text-validation-error">
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  data-testid="button-cancel-booking"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createBookingMutation.isPending || validationErrors.length > 0}
                  className="bg-rosae-red hover:bg-rosae-dark-red"
                  data-testid="button-save-booking"
                >
                  <Save className="mr-2 w-4 h-4" />
                  {createBookingMutation.isPending ? "Saving..." : "Save Booking"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
