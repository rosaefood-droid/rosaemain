import { sql } from 'drizzle-orm';
import {
  index,
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: text("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  passwordHash: text("password_hash"),
  role: text("role").default("employee"), // admin, employee
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// Theatre bookings table
export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`),
  theatreName: text("theatre_name").notNull(),
  timeSlot: text("time_slot").notNull(),
  guests: integer("guests").notNull(),
  totalAmount: real("total_amount").notNull(),
  cashAmount: real("cash_amount").notNull(),
  upiAmount: real("upi_amount").notNull(),
  snacksAmount: real("snacks_amount").default(0),
  snacksCash: real("snacks_cash").default(0),
  snacksUpi: real("snacks_upi").default(0),
  bookingDate: text("booking_date").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Expenses table
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Leave applications table
export const leaveApplications = sqliteTable("leave_applications", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`),
  userId: text("user_id").references(() => users.id).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending"), // pending, approved, rejected
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Activity logs table
export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`),
  userId: text("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: text("details"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Customer tickets table
export const customerTickets = sqliteTable("customer_tickets", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("medium"), // low, medium, high
  status: text("status").default("open"), // open, in_progress, closed
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  imageUrl: text("image_url"), // for uploaded images
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// Calendar events table for webhook integration
export const calendarEvents = sqliteTable("calendar_events", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`),
  bookingId: text("booking_id").references(() => bookings.id).notNull(),
  googleCalendarEventId: text("google_calendar_event_id"),
  title: text("title").notNull(),
  description: text("description"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location"),
  status: text("status").default("confirmed"), // confirmed, cancelled
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// Sales reports table for food and screens
export const salesReports = sqliteTable("sales_reports", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`),
  reportDate: text("report_date").notNull(),
  totalRevenue: real("total_revenue").notNull(),
  foodSales: real("food_sales").default(0),
  screenSales: real("screen_sales").default(0),
  totalBookings: integer("total_bookings").default(0),
  totalGuests: integer("total_guests").default(0),
  avgBookingValue: real("avg_booking_value").default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Insert schemas
export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdBy: true,
  createdAt: true,
}).extend({
  guests: z.coerce.number().min(1, "At least 1 guest required"),
  totalAmount: z.coerce.number().min(0, "Total amount must be positive"),
  cashAmount: z.coerce.number().min(0, "Cash amount must be positive"),
  upiAmount: z.coerce.number().min(0, "UPI amount must be positive"),
  snacksAmount: z.coerce.number().min(0, "Snacks amount must be positive").optional(),
  snacksCash: z.coerce.number().min(0, "Snacks cash must be positive").optional(),
  snacksUpi: z.coerce.number().min(0, "Snacks UPI must be positive").optional(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdBy: true,
  createdAt: true,
}).extend({
  amount: z.coerce.number().min(0, "Amount must be positive"),
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
  first_name: true,
  last_name: true,
  profile_image_url: true,
  role: true,
});

export const insertCustomerTicketSchema = createInsertSchema(customerTickets).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
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
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertLeaveApplication = z.infer<typeof insertLeaveApplicationSchema>;
export type LeaveApplication = typeof leaveApplications.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertCustomerTicket = z.infer<typeof insertCustomerTicketSchema>;
export type CustomerTicket = typeof customerTickets.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertSalesReport = z.infer<typeof insertSalesReportSchema>;
export type SalesReport = typeof salesReports.$inferSelect;
