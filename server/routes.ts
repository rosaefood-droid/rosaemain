import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupDevAuth, isAuthenticated } from "./devAuth";
import { insertBookingSchema, insertExpenseSchema, insertLeaveApplicationSchema, insertCustomerTicketSchema, type Booking } from "@shared/schema";

// Calendar webhook helper function
async function createCalendarEvent(booking: Booking) {
  const startTime = new Date(`${booking.bookingDate}T${booking.timeSlot.split('-')[0]}:00`);
  const endTime = new Date(`${booking.bookingDate}T${booking.timeSlot.split('-')[1]}:00`);
  
  const calendarEvent = {
    bookingId: booking.id,
    title: `${booking.theatreName} Booking - ${booking.guests} guests`,
    description: `Theatre booking for ${booking.guests} guests. Total: ₹${booking.totalAmount}. Created by: ${booking.createdBy}`,
    startTime,
    endTime,
    location: booking.theatreName,
  };

  return await storage.createCalendarEvent(calendarEvent);
}

// Webhook endpoint for calendar integration
async function sendWebhookNotification(action: string, data: any) {
  // This would integrate with external calendar APIs like Google Calendar
  // For now, we'll just log the webhook data
  console.log(`Calendar webhook: ${action}`, data);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware (dev mode)
  await setupDevAuth(app);

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
      console.log("Raw booking data:", req.body);
      const bookingData = insertBookingSchema.parse(req.body);
      console.log("Parsed booking data:", bookingData);
      
      // Validate that cash + UPI equals total amount
      const totalPaid = bookingData.cashAmount + bookingData.upiAmount;
      const snacksPaid = (bookingData.snacksCash || 0) + (bookingData.snacksUpi || 0);
      
      if (Math.abs(totalPaid - bookingData.totalAmount) > 0.01) {
        return res.status(400).json({ message: "Cash + UPI must equal total amount" });
      }
      
      if (Math.abs(snacksPaid - (bookingData.snacksAmount || 0)) > 0.01) {
        return res.status(400).json({ message: "Snacks cash + UPI must equal snacks amount" });
      }

      const booking = await storage.createBooking({
        ...bookingData,
        createdBy: userId,
      } as any);

      // Create calendar event
      try {
        await createCalendarEvent(booking);
      } catch (calendarError) {
        console.error("Failed to create calendar event:", calendarError);
        // Don't fail the booking creation if calendar fails
      }

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

  // Customer ticket routes
  app.post('/api/customer-tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ticketData = insertCustomerTicketSchema.parse(req.body);
      
      const ticket = await storage.createCustomerTicket({
        ...ticketData,
        status: 'open',
        createdBy: userId,
      });

      await storage.logActivity(userId, "CREATE", "CUSTOMER_TICKET", ticket.id, `Created customer ticket: ${ticketData.title}`);
      
      res.json(ticket);
    } catch (error) {
      console.error("Error creating customer ticket:", error);
      res.status(500).json({ message: "Failed to create customer ticket" });
    }
  });

  app.get('/api/customer-tickets', isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getAllCustomerTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching customer tickets:", error);
      res.status(500).json({ message: "Failed to fetch customer tickets" });
    }
  });

  app.patch('/api/customer-tickets/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { status, assignedTo } = req.body;
      
      if (!['open', 'in_progress', 'closed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedTicket = await storage.updateTicketStatus(id, status, assignedTo);
      await storage.logActivity(userId, "UPDATE", "CUSTOMER_TICKET", id, `Updated ticket status to ${status}`);
      
      res.json(updatedTicket);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });

  // Expense export route
  app.get('/api/expenses/export', isAuthenticated, async (req, res) => {
    try {
      const { category } = req.query;
      let expenses;
      
      if (category) {
        expenses = await storage.getExpensesByCategory(category as string);
      } else {
        expenses = await storage.getAllExpenses();
      }
      
      // Generate CSV
      const csvHeaders = 'Date,Category,Description,Amount\n';
      const csvData = expenses.map(expense => 
        `${expense.expenseDate},${expense.category},"${expense.description}",${expense.amount}`
      ).join('\n');
      
      const csv = csvHeaders + csvData;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="expenses${category ? `_${category}` : ''}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting expenses:", error);
      res.status(500).json({ message: "Failed to export expenses" });
    }
  });

  // Customer ticket routes
  app.post('/api/customer-tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ticketData = insertCustomerTicketSchema.parse(req.body);
      
      const ticket = await storage.createCustomerTicket({
        ...ticketData,
        createdBy: userId,
      });

      await storage.logActivity(userId, "CREATE", "CUSTOMER_TICKET", ticket.id, `Created ticket: ${ticketData.title}`);
      
      res.json(ticket);
    } catch (error) {
      console.error("Error creating customer ticket:", error);
      res.status(500).json({ message: "Failed to create customer ticket" });
    }
  });

  app.get('/api/customer-tickets', isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getAllCustomerTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching customer tickets:", error);
      res.status(500).json({ message: "Failed to fetch customer tickets" });
    }
  });

  app.patch('/api/customer-tickets/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { status, assignedTo } = req.body;
      
      const updatedTicket = await storage.updateTicketStatus(id, status, assignedTo);
      await storage.logActivity(userId, "UPDATE", "CUSTOMER_TICKET", id, `Updated ticket status to ${status}`);
      
      res.json(updatedTicket);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });

  // Expense export routes
  app.get('/api/expenses/export', isAuthenticated, async (req, res) => {
    try {
      const { category, startDate, endDate } = req.query;
      let expenses;
      
      if (category) {
        expenses = await storage.getExpensesByCategory(category as string);
      } else if (startDate && endDate) {
        expenses = await storage.getExpensesByDateRange(startDate as string, endDate as string);
      } else {
        expenses = await storage.getAllExpenses();
      }

      // Generate CSV format
      const csvHeaders = 'Date,Category,Description,Amount\n';
      const csvData = expenses.map(expense => 
        `${expense.expenseDate},${expense.category},"${expense.description}",${expense.amount}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
      res.send(csvHeaders + csvData);
    } catch (error) {
      console.error("Error exporting expenses:", error);
      res.status(500).json({ message: "Failed to export expenses" });
    }
  });

  // Calendar webhook routes
  app.post('/api/webhooks/calendar', async (req, res) => {
    try {
      const { action, bookingId, eventData } = req.body;
      
      switch (action) {
        case 'update':
          if (eventData && bookingId) {
            const calendarEvent = await storage.getCalendarEventByBookingId(bookingId);
            if (calendarEvent) {
              await storage.updateCalendarEvent(calendarEvent.id, eventData);
            }
          }
          break;
          
        case 'delete':
          if (bookingId) {
            await storage.deleteCalendarEvent(bookingId);
          }
          break;
          
        default:
          return res.status(400).json({ message: "Invalid action" });
      }
      
      await sendWebhookNotification(action, { bookingId, eventData });
      res.json({ success: true });
    } catch (error) {
      console.error("Error handling calendar webhook:", error);
      res.status(500).json({ message: "Failed to handle webhook" });
    }
  });

  // Sales report routes
  app.get('/api/sales-reports', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const reports = await storage.getSalesReports(startDate as string, endDate as string);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching sales reports:", error);
      res.status(500).json({ message: "Failed to fetch sales reports" });
    }
  });

  app.post('/api/sales-reports/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.body;
      
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }
      
      const report = await storage.generateDailySalesReport(date);
      await storage.logActivity(userId, "GENERATE", "SALES_REPORT", report.id, `Generated sales report for ${date}`);
      
      res.json(report);
    } catch (error) {
      console.error("Error generating sales report:", error);
      res.status(500).json({ message: "Failed to generate sales report" });
    }
  });

  // Booking edit and delete routes
  app.put('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const bookingData = insertBookingSchema.parse(req.body);
      
      const updatedBooking = await storage.updateBooking(id, bookingData);
      
      // Update calendar event
      try {
        const calendarEvent = await storage.getCalendarEventByBookingId(id);
        if (calendarEvent) {
          await createCalendarEvent(updatedBooking);
        }
      } catch (calendarError) {
        console.error("Failed to update calendar event:", calendarError);
      }

      await storage.logActivity(userId, "UPDATE", "BOOKING", id, `Updated booking for ${bookingData.theatreName}`);
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Delete calendar event first
      try {
        await storage.deleteCalendarEvent(id);
        await sendWebhookNotification('delete', { bookingId: id });
      } catch (calendarError) {
        console.error("Failed to delete calendar event:", calendarError);
      }
      
      await storage.deleteBooking(id);
      await storage.logActivity(userId, "DELETE", "BOOKING", id, "Deleted booking");
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'employee'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUserRole(id, role);
      await storage.logActivity(req.user.claims.sub, "UPDATE", "USER_ROLE", id, `Updated user role to ${role}`);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
