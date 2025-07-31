import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertBookingSchema, insertExpenseSchema, insertLeaveApplicationSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Booking routes
  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Validate that cash + UPI equals total amount
      const totalPaid = Number(bookingData.cashAmount) + Number(bookingData.upiAmount);
      const snacksPaid = Number(bookingData.snacksCash) + Number(bookingData.snacksUpi);
      
      if (Math.abs(totalPaid - Number(bookingData.totalAmount)) > 0.01) {
        return res.status(400).json({ message: "Cash + UPI must equal total amount" });
      }
      
      if (Math.abs(snacksPaid - Number(bookingData.snacksAmount)) > 0.01) {
        return res.status(400).json({ message: "Snacks cash + UPI must equal snacks amount" });
      }

      const booking = await storage.createBooking({
        ...bookingData,
        createdBy: userId,
      } as any);

      await storage.logActivity(userId, "CREATE", "BOOKING", booking.id, `Created booking for ${bookingData.theatreName}`);
      
      res.json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get('/api/bookings', isAuthenticated, async (req, res) => {
    try {
      const { limit } = req.query;
      const bookings = await storage.getAllBookings(limit ? parseInt(limit as string) : undefined);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/bookings/date-range', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const bookings = await storage.getBookingsByDateRange(startDate as string, endDate as string);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings by date range:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Expense routes
  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expenseData = insertExpenseSchema.parse(req.body);
      
      const expense = await storage.createExpense({
        ...expenseData,
        createdBy: userId,
      } as any);

      await storage.logActivity(userId, "CREATE", "EXPENSE", expense.id, `Created expense: ${expenseData.description}`);
      
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.get('/api/expenses', isAuthenticated, async (req, res) => {
    try {
      const { limit } = req.query;
      const expenses = await storage.getAllExpenses(limit ? parseInt(limit as string) : undefined);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  // Leave management routes
  app.post('/api/leave-applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leaveData = insertLeaveApplicationSchema.parse(req.body);
      
      const leave = await storage.createLeaveApplication({
        ...leaveData,
        userId,
      });

      await storage.logActivity(userId, "CREATE", "LEAVE_APPLICATION", leave.id, `Applied for leave from ${leaveData.startDate} to ${leaveData.endDate}`);
      
      res.json(leave);
    } catch (error) {
      console.error("Error creating leave application:", error);
      res.status(500).json({ message: "Failed to create leave application" });
    }
  });

  app.get('/api/leave-applications', isAuthenticated, async (req, res) => {
    try {
      const leaves = await storage.getLeaveApplications();
      res.json(leaves);
    } catch (error) {
      console.error("Error fetching leave applications:", error);
      res.status(500).json({ message: "Failed to fetch leave applications" });
    }
  });

  app.patch('/api/leave-applications/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedLeave = await storage.updateLeaveStatus(id, status, userId);
      await storage.logActivity(userId, "UPDATE", "LEAVE_APPLICATION", id, `${status} leave application`);
      
      res.json(updatedLeave);
    } catch (error) {
      console.error("Error updating leave status:", error);
      res.status(500).json({ message: "Failed to update leave status" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/daily-revenue', isAuthenticated, async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const data = await storage.getDailyRevenue(parseInt(days as string));
      res.json(data);
    } catch (error) {
      console.error("Error fetching daily revenue:", error);
      res.status(500).json({ message: "Failed to fetch daily revenue" });
    }
  });

  app.get('/api/analytics/payment-methods', isAuthenticated, async (req, res) => {
    try {
      const data = await storage.getPaymentMethodBreakdown();
      res.json(data);
    } catch (error) {
      console.error("Error fetching payment method breakdown:", error);
      res.status(500).json({ message: "Failed to fetch payment method breakdown" });
    }
  });

  app.get('/api/analytics/time-slots', isAuthenticated, async (req, res) => {
    try {
      const data = await storage.getTimeSlotPerformance();
      res.json(data);
    } catch (error) {
      console.error("Error fetching time slot performance:", error);
      res.status(500).json({ message: "Failed to fetch time slot performance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
