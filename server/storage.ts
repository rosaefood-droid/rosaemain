import crypto from "crypto";
import {
  users,
  bookings,
  expenses,
  leaveApplications,
  activityLogs,
  customerTickets,
  calendarEvents,
  salesReports,
  type User,
  type UpsertUser,
  type InsertBooking,
  type Booking,
  type InsertExpense,
  type Expense,
  type InsertLeaveApplication,
  type LeaveApplication,
  type ActivityLog,
  type InsertCustomerTicket,
  type CustomerTicket,
  type InsertCalendarEvent,
  type CalendarEvent,
  type InsertSalesReport,
  type SalesReport,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { hashPassword } from "./auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  createBooking(booking: InsertBooking): Promise<Booking>;
  getAllBookings(limit?: number): Promise<Booking[]>;
  getBookingsByDateRange(startDate: string, endDate: string): Promise<Booking[]>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking>;
  deleteBooking(id: string): Promise<void>;

  createExpense(expense: InsertExpense): Promise<Expense>;
  getAllExpenses(limit?: number): Promise<Expense[]>;
  getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]>;
  getExpensesByCategory(category: string): Promise<Expense[]>;

  createLeaveApplication(leave: InsertLeaveApplication): Promise<LeaveApplication>;
  getLeaveApplications(): Promise<LeaveApplication[]>;
  updateLeaveStatus(id: string, status: string, reviewedBy: string): Promise<LeaveApplication>;

  createCustomerTicket(ticket: InsertCustomerTicket): Promise<CustomerTicket>;
  getAllCustomerTickets(): Promise<CustomerTicket[]>;
  updateTicketStatus(id: string, status: string, assignedTo?: string): Promise<CustomerTicket>;

  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(bookingId: string): Promise<void>;
  getCalendarEventByBookingId(bookingId: string): Promise<CalendarEvent | undefined>;

  createSalesReport(report: InsertSalesReport): Promise<SalesReport>;
  getSalesReports(startDate: string, endDate: string): Promise<SalesReport[]>;
  generateDailySalesReport(date: string): Promise<SalesReport>;

  getDailyRevenue(days: number): Promise<Array<{ date: string; revenue: number; bookings: number }>>;
  getPaymentMethodBreakdown(): Promise<{ cash: number; upi: number }>;
  getTimeSlotPerformance(): Promise<Array<{ timeSlot: string; bookings: number; revenue: number }>>;

  logActivity(userId: string, action: string, resourceType: string, resourceId?: string, details?: string): Promise<void>;

  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch {
      const [user] = await db
        .update(users)
        .set({ ...userData, updatedAt: new Date().toISOString() })
        .where(eq(users.id, userData.id!))
        .returning();
      return user;
    }
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db
      .insert(bookings)
      .values({
        ...booking,
        snacksAmount: booking.snacksAmount || 0,
        snacksCash: booking.snacksCash || 0,
        snacksUpi: booking.snacksUpi || 0,
      })
      .returning();
    return newBooking;
  }

  async getAllBookings(limit = 50): Promise<Booking[]> {
    return db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(limit);
  }

  async getBookingsByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(and(gte(bookings.bookingDate, startDate), lte(bookings.bookingDate, endDate)))
      .orderBy(desc(bookings.bookingDate));
  }

  async updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking> {
    const [updated] = await db
      .update(bookings)
      .set(booking)
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async deleteBooking(id: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async getAllExpenses(limit = 50): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.createdAt)).limit(limit);
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    return db
      .select()
      .from(expenses)
      .where(and(gte(expenses.expenseDate, startDate), lte(expenses.expenseDate, endDate)))
      .orderBy(desc(expenses.expenseDate));
  }

  async getExpensesByCategory(category: string): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.category, category)).orderBy(desc(expenses.expenseDate));
  }

  async createLeaveApplication(leave: InsertLeaveApplication): Promise<LeaveApplication> {
    const [newLeave] = await db.insert(leaveApplications).values(leave).returning();
    return newLeave;
  }

  async getLeaveApplications(): Promise<LeaveApplication[]> {
    return db.select().from(leaveApplications).orderBy(desc(leaveApplications.createdAt));
  }

  async updateLeaveStatus(id: string, status: string, reviewedBy: string): Promise<LeaveApplication> {
    const [updatedLeave] = await db
      .update(leaveApplications)
      .set({ status, reviewedBy, reviewedAt: new Date().toISOString() })
      .where(eq(leaveApplications.id, id))
      .returning();
    return updatedLeave;
  }

  async createCustomerTicket(ticket: InsertCustomerTicket): Promise<CustomerTicket> {
    const [newTicket] = await db.insert(customerTickets).values(ticket).returning();
    return newTicket;
  }

  async getAllCustomerTickets(): Promise<CustomerTicket[]> {
    return db.select().from(customerTickets).orderBy(desc(customerTickets.createdAt));
  }

  async updateTicketStatus(id: string, status: string, assignedTo?: string): Promise<CustomerTicket> {
    const [updated] = await db
      .update(customerTickets)
      .set({ status, assignedTo, updatedAt: new Date().toISOString() })
      .where(eq(customerTickets.id, id))
      .returning();
    return updated;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db.insert(calendarEvents).values(event).returning();
    return newEvent;
  }

  async updateCalendarEvent(id: string, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const [updated] = await db
      .update(calendarEvents)
              .set({ ...event, updatedAt: new Date().toISOString() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return updated;
  }

  async deleteCalendarEvent(bookingId: string): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.bookingId, bookingId));
  }

  async getCalendarEventByBookingId(bookingId: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.bookingId, bookingId));
    return event;
  }

  async createSalesReport(report: InsertSalesReport): Promise<SalesReport> {
    const [newReport] = await db.insert(salesReports).values(report).returning();
    return newReport;
  }

  async getSalesReports(startDate: string, endDate: string): Promise<SalesReport[]> {
    return db
      .select()
      .from(salesReports)
      .where(and(gte(salesReports.reportDate, startDate), lte(salesReports.reportDate, endDate)))
      .orderBy(desc(salesReports.reportDate));
  }

  async generateDailySalesReport(date: string): Promise<SalesReport> {
    const [totals] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${bookings.totalAmount}), 0)`,
        foodSales: sql<number>`COALESCE(SUM(${bookings.snacksAmount}), 0)`,
        screenSales: sql<number>`COALESCE(SUM(${bookings.totalAmount} - ${bookings.snacksAmount}), 0)`,
        totalBookings: sql<number>`COUNT(*)`,
        totalGuests: sql<number>`COALESCE(SUM(${bookings.guests}), 0)`,
      })
      .from(bookings)
      .where(eq(bookings.bookingDate, date));

    const avgBookingValue = totals.totalBookings > 0 ? totals.totalRevenue / totals.totalBookings : 0;

    return this.createSalesReport({
      reportDate: date,
      totalRevenue: totals.totalRevenue.toString(),
      foodSales: totals.foodSales.toString(),
      screenSales: totals.screenSales.toString(),
      totalBookings: totals.totalBookings,
      totalGuests: totals.totalGuests,
      avgBookingValue: avgBookingValue.toString(),
    });
  }

  async getDailyRevenue(days: number): Promise<Array<{ date: string; revenue: number; bookings: number }>> {
    const result = await db
      .select({
        date: bookings.bookingDate,
        revenue: sql<number>`COALESCE(SUM(${bookings.totalAmount} + ${bookings.snacksAmount}), 0)`,
        bookings: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(gte(bookings.bookingDate, sql`date('now', '-${sql.raw(days.toString())} days')`))
      .groupBy(bookings.bookingDate)
      .orderBy(bookings.bookingDate);

    return result.map(row => ({
      date: row.date,
      revenue: Number(row.revenue),
      bookings: Number(row.bookings),
    }));
  }

  async getPaymentMethodBreakdown(): Promise<{ cash: number; upi: number }> {
    const [result] = await db
      .select({
        cash: sql<number>`COALESCE(SUM(${bookings.cashAmount} + ${bookings.snacksCash}), 0)`,
        upi: sql<number>`COALESCE(SUM(${bookings.upiAmount} + ${bookings.snacksUpi}), 0)`,
      })
      .from(bookings);

    return {
      cash: Number(result.cash),
      upi: Number(result.upi),
    };
  }

  async getTimeSlotPerformance(): Promise<Array<{ timeSlot: string; bookings: number; revenue: number }>> {
    const result = await db
      .select({
        timeSlot: bookings.timeSlot,
        bookings: sql<number>`COUNT(*)`,
        revenue: sql<number>`COALESCE(SUM(${bookings.totalAmount} + ${bookings.snacksAmount}), 0)`,
      })
      .from(bookings)
      .groupBy(bookings.timeSlot)
      .orderBy(bookings.timeSlot);

    return result.map(row => ({
      timeSlot: row.timeSlot,
      bookings: Number(row.bookings),
      revenue: Number(row.revenue),
    }));
  }

  async logActivity(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: string
  ): Promise<void> {
    await db.insert(activityLogs).values({
      userId,
      action,
      resourceType,
      resourceId: resourceId || "",
      details: details || "",
    });
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }): Promise<User> {
    const passwordHash = await hashPassword(userData.password);
    
    const [user] = await db.insert(users).values({
      id: crypto.randomUUID(),
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      passwordHash: passwordHash,
      role: userData.role || 'employee',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getConfig(): Promise<{ theatres: string[]; timeSlots: string[] }> {
    // For now, return default config. In a real app, this would be stored in database
    return {
      theatres: [
        "Screen 1",
        "Screen 2", 
        "Screen 3",
        "VIP Screen",
        "Premium Hall"
      ],
      timeSlots: [
        "10:00 AM - 12:00 PM",
        "12:00 PM - 2:00 PM", 
        "2:00 PM - 4:00 PM",
        "4:00 PM - 6:00 PM",
        "6:00 PM - 8:00 PM",
        "8:00 PM - 10:00 PM"
      ]
    };
  }

  async updateConfig(config: { theatres: string[]; timeSlots: string[] }): Promise<{ theatres: string[]; timeSlots: string[] }> {
    // In a real app, this would save to database
    // For now, just return the updated config
    return config;
  }
}

export const storage = new DatabaseStorage();
