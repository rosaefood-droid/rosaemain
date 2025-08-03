import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// import { setupAuth, isAuthenticated } from "./replitAuth";
import { isAuthenticated } from "./devAuth";
import { insertBookingSchema, insertExpenseSchema, insertLeaveApplicationSchema, insertCustomerTicketSchema, type Booking } from "@shared/schema";
import session from "express-session";
import bcrypt from "bcryptjs";

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
  // Set up session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'rosae-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  }));

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if user is authenticated via session
      const sessionUser = (req as any).session?.user;
      
      if (!sessionUser) {
        return res.status(401).json({ message: "Unauthorized - Please login" });
      }

      // Return the user data from session
      res.json({
        id: sessionUser.claims.sub,
        email: sessionUser.claims.email,
        firstName: sessionUser.claims.first_name,
        lastName: sessionUser.claims.last_name,
        profileImageUrl: sessionUser.claims.profile_image_url,
        role: 'admin', // Default to admin for development
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log('Login attempt:', req.body);
      const { email, password } = req.body;
      
      if (!email || !password) {
        console.log('Missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
      }

      console.log('Checking credentials:', { email, password });

      // Check if it's admin login
      if (email === 'admin@rosae.com' && password === 'Rosae@spaces') {
        console.log('Admin credentials valid');
        const user = {
          id: 'admin-001',
          email: 'admin@rosae.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        };
        
        // Set session with claims structure to match isAuthenticated middleware
        (req as any).session.user = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: null,
          },
          access_token: "dev-token",
        };
        console.log('Session set:', (req as any).session);
        
        res.json(user);
      } else {
              // Check for employee login
      try {
        console.log('=== EMPLOYEE LOGIN DEBUG ===');
        console.log('Email provided:', email);
        console.log('Password provided:', password);
        
        const user = await storage.getUserByEmail(email);
        console.log('Database lookup result:', user ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hasPasswordHash: !!user.passwordHash,
          passwordHashLength: user.passwordHash ? user.passwordHash.length : 0
        } : 'User not found');
        
        if (user && user.passwordHash) {
          console.log('Attempting password comparison...');
          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          console.log('Password comparison result:', isValidPassword);
          
          if (isValidPassword) {
            console.log('✅ Employee login successful for:', user.email);
            
            // Set session with claims structure
            (req as any).session.user = {
              claims: {
                sub: user.id,
                email: user.email,
                first_name: user.firstName,
                last_name: user.lastName,
                profile_image_url: user.profileImageUrl,
              },
              access_token: "dev-token",
            };
            console.log('Session created for employee:', (req as any).session.user);
            
            res.json({
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role
            });
          } else {
            console.log('❌ Invalid password for employee:', user.email);
            res.status(401).json({ message: 'Invalid credentials' });
          }
        } else {
          console.log('❌ User not found or missing password hash');
          res.status(401).json({ message: 'Invalid credentials' });
        }
      } catch (error) {
        console.error('❌ Error during employee login:', error);
        res.status(401).json({ message: 'Invalid credentials' });
      }
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Check auth status
  app.get('/api/auth/status', async (req, res) => {
    console.log('Auth status check - session:', (req as any).session);
    const sessionUser = (req as any).session?.user;
    console.log('Session user:', sessionUser);
    
    if (sessionUser && sessionUser.claims) {
      try {
        // Get user from database to get the correct role
        const user = await storage.getUserByEmail(sessionUser.claims.email);
        const userData = {
          id: sessionUser.claims.sub,
          email: sessionUser.claims.email,
          firstName: sessionUser.claims.first_name,
          lastName: sessionUser.claims.last_name,
          profileImageUrl: sessionUser.claims.profile_image_url,
          role: user?.role || (sessionUser.claims.email === 'admin@rosae.com' ? 'admin' : 'employee'),
        };
        console.log('Returning authenticated user:', userData);
        res.json({ authenticated: true, user: userData });
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to session data
        const userData = {
          id: sessionUser.claims.sub,
          email: sessionUser.claims.email,
          firstName: sessionUser.claims.first_name,
          lastName: sessionUser.claims.last_name,
          profileImageUrl: sessionUser.claims.profile_image_url,
          role: sessionUser.claims.email === 'admin@rosae.com' ? 'admin' : 'employee',
        };
        res.json({ authenticated: true, user: userData });
      }
    } else {
      console.log('No valid session found');
      res.json({ authenticated: false });
    }
  });

  // Get all users (admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser.claims.email !== 'admin@rosae.com') {
        return res.status(403).json({ message: 'Only admins can view all users' });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Create new user (admin only)
  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser.claims.email !== 'admin@rosae.com') {
        return res.status(403).json({ message: 'Only admins can create users' });
      }

      const { email, password, firstName, lastName, role = 'employee' } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Email, password, first name, and last name are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Create new user
      const newUser = await storage.createUser({
        email,
        password,
        firstName,
        lastName,
        role
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Admin routes for admin panel
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser.claims.email !== 'admin@rosae.com') {
        return res.status(403).json({ message: 'Only admins can access admin panel' });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.patch('/api/admin/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser.claims.email !== 'admin@rosae.com') {
        return res.status(403).json({ message: 'Only admins can update user roles' });
      }

      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'employee'].includes(role)) {
        return res.status(400).json({ message: 'Valid role is required' });
      }

      const updatedUser = await storage.updateUserRole(userId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  });

  // Debug route to check all users (remove in production)
  app.get('/api/debug/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      console.log('=== DEBUG: All users in database ===');
      users.forEach(user => {
        console.log({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hasPassword: !!user.passwordHash,
          passwordLength: user.passwordHash ? user.passwordHash.length : 0
        });
      });
      res.json(users);
    } catch (error) {
      console.error('Error fetching users for debug:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Configuration management routes
  app.get('/api/config', async (req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({ message: 'Failed to fetch configuration' });
    }
  });

  app.post('/api/config', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser.claims.email !== 'admin@rosae.com') {
        return res.status(403).json({ message: 'Only admins can update configuration' });
      }

      const { theatres, timeSlots } = req.body;
      const config = await storage.updateConfig({ theatres, timeSlots });
      res.json(config);
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ message: 'Failed to update configuration' });
    }
  });

  // Delete user (admin only)
  app.delete('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser.claims.email !== 'admin@rosae.com') {
        return res.status(403).json({ message: 'Only admins can delete users' });
      }

      const { userId } = req.params;

      // Prevent deleting the main admin
      if (userId === 'admin-001') {
        return res.status(400).json({ message: 'Cannot delete the main administrator' });
      }

      await storage.deleteUser(userId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
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

  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/expenses', isAuthenticated, async (req: any, res) => {
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
