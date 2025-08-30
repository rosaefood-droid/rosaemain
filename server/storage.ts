import { sql, eq } from "drizzle-orm";
import {
  index,
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { db } from "./db";



// Sessions
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: text("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .default(
      sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' ||
           substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
    ),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  passwordHash: text("password_hash"),
  role: text("role").default("employee"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Bookings
export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  theatreName: text("theatre_name").notNull(),
  timeSlot: text("time_slot").notNull(),
  guests: integer("guests").notNull(),
  totalAmount: real("total_amount").notNull().default(0),
  cashAmount: real("cash_amount").notNull().default(0),
  upiAmount: real("upi_amount").notNull().default(0),
  snacksAmount: real("snacks_amount").notNull().default(0),
  snacksCash: real("snacks_cash").notNull().default(0),
  snacksUpi: real("snacks_upi").notNull().default(0),
  bookingDate: text("booking_date").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Expenses
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Leave Applications
export const leaveApplications = sqliteTable("leave_applications", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  userId: text("user_id").references(() => users.id).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Activity Logs
export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  userId: text("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: text("details"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Calendar Events
export const calendarEvents = sqliteTable("calendar_events", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  bookingId: text("booking_id").references(() => bookings.id).notNull(),
  googleCalendarEventId: text("google_calendar_event_id"),
  title: text("title").notNull(),
  description: text("description"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location"),
  status: text("status").default("confirmed"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Sales Reports
export const salesReports = sqliteTable("sales_reports", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  reportDate: text("report_date").notNull(),
  totalRevenue: real("total_revenue").notNull().default(0),
  foodSales: real("food_sales").notNull().default(0),
  screenSales: real("screen_sales").notNull().default(0),
  totalBookings: integer("total_bookings").notNull().default(0),
  totalGuests: integer("total_guests").notNull().default(0),
  avgBookingValue: real("avg_booking_value").notNull().default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Configurations
export const configurations = sqliteTable("configurations", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

/* ---------------- SCHEMAS ---------------- */

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdBy: true,
  createdAt: true,
}).extend({
  guests: z.coerce.number().min(1),
  totalAmount: z.coerce.number().min(0),
  cashAmount: z.coerce.number().min(0),
  upiAmount: z.coerce.number().min(0),
  snacksAmount: z.coerce.number().min(0).optional(),
  snacksCash: z.coerce.number().min(0).optional(),
  snacksUpi: z.coerce.number().min(0).optional(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdBy: true,
  createdAt: true,
}).extend({
  amount: z.coerce.number().min(0),
});

export const insertLeaveApplicationSchema = createInsertSchema(leaveApplications).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesReportSchema = createInsertSchema(salesReports).omit({
  id: true,
  createdBy: true,
  createdAt: true,
}).extend({
  totalRevenue: z.coerce.number().min(0),
  foodSales: z.coerce.number().min(0),
  screenSales: z.coerce.number().min(0),
  totalBookings: z.coerce.number().min(0),
  totalGuests: z.coerce.number().min(0),
  avgBookingValue: z.coerce.number().min(0),
});

export const insertConfigurationSchema = createInsertSchema(configurations).omit({
  updatedAt: true,
});

/* ---------------- TYPES ---------------- */
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;
export type Configuration = typeof configurations.$inferSelect;
export type InsertLeaveApplication = z.infer<typeof insertLeaveApplicationSchema>;
export type LeaveApplication = typeof leaveApplications.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertSalesReport = z.infer<typeof insertSalesReportSchema>;
export type SalesReport = typeof salesReports.$inferSelect;

// Define schema object after all tables are defined
const schema = { users, bookings, expenses, leaveApplications, activityLogs, calendarEvents, salesReports, configurations };

// Create a storage interface for database operations
export const storage = {
  // User operations
  async findUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  },
  
  async getUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  },
  
  async getUser(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  },
  
  async getAllUsers() {
    return db.query.users.findMany({
      orderBy: (users, { asc }) => [asc(users.firstName)],
    });
  },
  
  async createUser(user: any) {
    return db.insert(users).values(user).returning();
  },
  
  async upsertUser(user: any) {
    // Check if user exists
    const existingUser = await this.getUser(user.id);
    
    if (existingUser) {
      // Update existing user
      return db.update(users)
        .set(user)
        .where(eq(users.id, user.id))
        .returning();
    } else {
      // Create new user
      return this.createUser(user);
    }
  },
  
  // Booking operations
  async createBooking(booking: any) {
    return db.insert(bookings).values(booking).returning();
  },
  
  async getAllBookings(page: number = 1, pageSize: number = 10) {
    const offset = (page - 1) * pageSize;
    const query = db.query.bookings.findMany({
      orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
      limit: pageSize,
      offset: offset,
    });
    
    // Get total count for pagination
    const countQuery = db.select({ count: sql`count(*)` }).from(bookings);
    const countResult = await countQuery.execute();
    const totalCount = Number(countResult[0]?.count || 0);
    
    const results = await query.execute();
    
    return {
      bookings: results,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    };
  },
  
  // Calendar operations
  async createCalendarEvent(event: any) {
    return db.insert(calendarEvents).values(event).returning();
  },
  
  // Activity log operations
  async logActivity(userId: string, action: string, resourceType: string, resourceId: string, details: string) {
    return db.insert(activityLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      details
    }).returning();
  },
  
  // Analytics operations
  async getDailyRevenue(days: number = 7) {
    // Get today's date
    const today = new Date();
    const result = [];
    
    // Generate data for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Query bookings for this date
      const dailyBookings = await db.query.bookings.findMany({
        where: eq(bookings.bookingDate, dateString)
      });
      
      // Calculate revenue and booking count
      const revenue = dailyBookings.reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
      
      result.push({
        date: dateString,
        revenue,
        bookings: dailyBookings.length
      });
    }
    
    return result;
  },
  
  async getPaymentMethodBreakdown() {
    // Get all bookings
    const allBookings = await db.query.bookings.findMany();
    
    // Calculate totals
    const cash = allBookings.reduce((sum, booking) => sum + Number(booking.cashAmount), 0);
    const upi = allBookings.reduce((sum, booking) => sum + Number(booking.upiAmount), 0);
    
    return { cash, upi };
  },
  
  async getTimeSlotPerformance() {
    // Get all bookings
    const allBookings = await db.query.bookings.findMany();
    
    // Group by time slot
    const slotMap = new Map();
    
    allBookings.forEach(booking => {
      const slot = booking.timeSlot;
      if (!slotMap.has(slot)) {
        slotMap.set(slot, { timeSlot: slot, bookings: 0, revenue: 0 });
      }
      
      const slotData = slotMap.get(slot);
      slotData.bookings += 1;
      slotData.revenue += Number(booking.totalAmount);
    });
    
    return Array.from(slotMap.values());
  },
  
  // Configuration operations
  async getConfig() {
    // Default configuration
    const defaultConfig = {
      theatres: ['Theatre 1', 'Theatre 2', 'Theatre 3'],
      timeSlots: ['10:00 AM', '1:00 PM', '4:00 PM', '7:00 PM']
    };
    
    try {
      // Get theatres configuration
      const theatresConfig = await db.query.configurations.findFirst({
        where: eq(configurations.key, 'theatres')
      });
      
      // Get time slots configuration
      const timeSlotsConfig = await db.query.configurations.findFirst({
        where: eq(configurations.key, 'timeSlots')
      });
      
      return {
        theatres: theatresConfig ? JSON.parse(theatresConfig.value) : defaultConfig.theatres,
        timeSlots: timeSlotsConfig ? JSON.parse(timeSlotsConfig.value) : defaultConfig.timeSlots
      };
    } catch (error) {
      console.error('Error fetching configuration:', error);
      return defaultConfig;
    }
  },
  
  async updateConfig({ theatres, timeSlots }: { theatres: string[], timeSlots: string[] }, userId: string) {
    try {
      // Update theatres configuration
      await db.insert(configurations)
        .values({
          key: 'theatres',
          value: JSON.stringify(theatres),
          updatedBy: userId
        })
        .onConflictDoUpdate({
          target: configurations.key,
          set: {
            value: JSON.stringify(theatres),
            updatedBy: userId,
            updatedAt: sql`(CURRENT_TIMESTAMP)`
          }
        });
      
      // Update time slots configuration
      await db.insert(configurations)
        .values({
          key: 'timeSlots',
          value: JSON.stringify(timeSlots),
          updatedBy: userId
        })
        .onConflictDoUpdate({
          target: configurations.key,
          set: {
            value: JSON.stringify(timeSlots),
            updatedBy: userId,
            updatedAt: sql`(CURRENT_TIMESTAMP)`
          }
        });
      
      return { theatres, timeSlots };
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  },
  
  // Other necessary database operations
  // Add more methods as needed for your application
};
