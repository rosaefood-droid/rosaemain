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

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getAllBookings(limit?: number): Promise<Booking[]>;
  getBookingsByDateRange(startDate: string, endDate: string): Promise<Booking[]>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking>;
  deleteBooking(id: string): Promise<void>;
  
  // Expense operations
  createExpense(expense: InsertExpense): Promise<Expense>;
  getAllExpenses(limit?: number): Promise<Expense[]>;
  getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]>;
  getExpensesByCategory(category: string): Promise<Expense[]>;
  
  // Leave operations
  createLeaveApplication(leave: InsertLeaveApplication): Promise<LeaveApplication>;
  getLeaveApplications(): Promise<LeaveApplication[]>;
  updateLeaveStatus(id: string, status: string, reviewedBy: string): Promise<LeaveApplication>;
  
  // Customer ticket operations
  createCustomerTicket(ticket: InsertCustomerTicket): Promise<CustomerTicket>;
  getAllCustomerTickets(): Promise<CustomerTicket[]>;
  updateTicketStatus(id: string, status: string, assignedTo?: string): Promise<CustomerTicket>;
  
  // Calendar event operations
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(bookingId: string): Promise<void>;
  getCalendarEventByBookingId(bookingId: string): Promise<CalendarEvent | undefined>;
  
  // Sales report operations
  createSalesReport(report: InsertSalesReport): Promise<SalesReport>;
  getSalesReports(startDate: string, endDate: string): Promise<SalesReport[]>;
  generateDailySalesReport(date: string): Promise<SalesReport>;
  
  // Analytics operations
  getDailyRevenue(days: number): Promise<Array<{ date: string; revenue: number; bookings: number }>>;
  getPaymentMethodBreakdown(): Promise<{ cash: number; upi: number }>;
  getTimeSlotPerformance(): Promise<Array<{ timeSlot: string; bookings: number; revenue: number }>>;
  
  // Activity logging
  logActivity(userId: string, action: string, resourceType: string, resourceId?: string, details?: string): Promise<void>;
  
  // User management operations
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
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db
      .insert(bookings)
      .values({
        ...booking,
        totalAmount: booking.totalAmount.toString(),
        cashAmount: booking.cashAmount.toString(),
        upiAmount: booking.upiAmount.toString(),
        snacksAmount: booking.snacksAmount?.toString() || "0",
        snacksCash: booking.snacksCash?.toString() || "0",
        snacksUpi: booking.snacksUpi?.toString() || "0",
      })
      .returning();
    return newBooking;
  }

  async getAllBookings(limit = 50): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .orderBy(desc(bookings.createdAt))
      .limit(limit);
  }

  async getBookingsByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          gte(bookings.bookingDate, startDate),
          lte(bookings.bookingDate, endDate)
        )
      )
      .orderBy(desc(bookings.bookingDate));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values({
        ...expense,
        amount: expense.amount.toString(),
      })
      .returning();
    return newExpense;
  }

  async getAllExpenses(limit = 50): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .orderBy(desc(expenses.createdAt))
      .limit(limit);
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      )
      .orderBy(desc(expenses.expenseDate));
  }

  async createLeaveApplication(leave: InsertLeaveApplication): Promise<LeaveApplication> {
    const [newLeave] = await db
      .insert(leaveApplications)
      .values(leave)
      .returning();
    return newLeave;
  }

  async getLeaveApplications(): Promise<LeaveApplication[]> {
    return await db
      .select()
      .from(leaveApplications)
      .orderBy(desc(leaveApplications.createdAt));
  }

  async updateLeaveStatus(id: string, status: string, reviewedBy: string): Promise<LeaveApplication> {
    const [updatedLeave] = await db
      .update(leaveApplications)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(leaveApplications.id, id))
      .returning();
    return updatedLeave;
  }

  async getDailyRevenue(days: number): Promise<Array<{ date: string; revenue: number; bookings: number }>> {
    const result = await db
      .select({
        date: bookings.bookingDate,
        revenue: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS NUMERIC) + CAST(${bookings.snacksAmount} AS NUMERIC)), 0)`,
        bookings: sql<number>`COALESCE(COUNT(*), 0)`,
      })
      .from(bookings)
      .where(gte(bookings.bookingDate, sql`CURRENT_DATE - INTERVAL '${sql.raw(days.toString())} days'`))
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
        cash: sql<number>`COALESCE(SUM(CAST(${bookings.cashAmount} AS NUMERIC) + CAST(${bookings.snacksCash} AS NUMERIC)), 0)`,
        upi: sql<number>`COALESCE(SUM(CAST(${bookings.upiAmount} AS NUMERIC) + CAST(${bookings.snacksUpi} AS NUMERIC)), 0)`,
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
        bookings: sql<number>`COALESCE(COUNT(*), 0)`,
        revenue: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS NUMERIC) + CAST(${bookings.snacksAmount} AS NUMERIC)), 0)`,
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

  async updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking> {
    const updateData: any = { ...booking };
    
    // Convert numbers to strings for decimal fields
    if (updateData.totalAmount !== undefined) updateData.totalAmount = updateData.totalAmount.toString();
    if (updateData.cashAmount !== undefined) updateData.cashAmount = updateData.cashAmount.toString();
    if (updateData.upiAmount !== undefined) updateData.upiAmount = updateData.upiAmount.toString();
    if (updateData.snacksAmount !== undefined) updateData.snacksAmount = updateData.snacksAmount.toString();
    if (updateData.snacksCash !== undefined) updateData.snacksCash = updateData.snacksCash.toString();
    if (updateData.snacksUpi !== undefined) updateData.snacksUpi = updateData.snacksUpi.toString();
    
    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async deleteBooking(id: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  async getExpensesByCategory(category: string): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.category, category))
      .orderBy(desc(expenses.expenseDate));
  }

  async createCustomerTicket(ticket: InsertCustomerTicket): Promise<CustomerTicket> {
    const [newTicket] = await db
      .insert(customerTickets)
      .values(ticket)
      .returning();
    return newTicket;
  }

  async getAllCustomerTickets(): Promise<CustomerTicket[]> {
    return await db
      .select()
      .from(customerTickets)
      .orderBy(desc(customerTickets.createdAt));
  }

  async updateTicketStatus(id: string, status: string, assignedTo?: string): Promise<CustomerTicket> {
    const [updated] = await db
      .update(customerTickets)
      .set({
        status,
        assignedTo,
        updatedAt: new Date(),
      })
      .where(eq(customerTickets.id, id))
      .returning();
    return updated;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db
      .insert(calendarEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateCalendarEvent(id: string, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const [updated] = await db
      .update(calendarEvents)
      .set({
        ...event,
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, id))
      .returning();
    return updated;
  }

  async deleteCalendarEvent(bookingId: string): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.bookingId, bookingId));
  }

  async getCalendarEventByBookingId(bookingId: string): Promise<CalendarEvent | undefined> {
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.bookingId, bookingId));
    return event;
  }

  async createSalesReport(report: InsertSalesReport): Promise<SalesReport> {
    const [newReport] = await db
      .insert(salesReports)
      .values(report)
      .returning();
    return newReport;
  }

  async getSalesReports(startDate: string, endDate: string): Promise<SalesReport[]> {
    return await db
      .select()
      .from(salesReports)
      .where(
        and(
          gte(salesReports.reportDate, startDate),
          lte(salesReports.reportDate, endDate)
        )
      )
      .orderBy(desc(salesReports.reportDate));
  }

  async generateDailySalesReport(date: string): Promise<SalesReport> {
    // Calculate daily totals from bookings
    const [totals] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS NUMERIC)), 0)`,
        foodSales: sql<number>`COALESCE(SUM(CAST(${bookings.snacksAmount} AS NUMERIC)), 0)`,
        screenSales: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS NUMERIC) - CAST(${bookings.snacksAmount} AS NUMERIC)), 0)`,
        totalBookings: sql<number>`COALESCE(COUNT(*), 0)`,
        totalGuests: sql<number>`COALESCE(SUM(${bookings.guests}), 0)`,
      })
      .from(bookings)
      .where(eq(bookings.bookingDate, date));

    const avgBookingValue = totals.totalBookings > 0 ? totals.totalRevenue / totals.totalBookings : 0;

    const reportData = {
      reportDate: date,
      totalRevenue: totals.totalRevenue.toString(),
      foodSales: totals.foodSales.toString(),
      screenSales: totals.screenSales.toString(),
      totalBookings: totals.totalBookings,
      totalGuests: totals.totalGuests,
      avgBookingValue: avgBookingValue.toString(),
    };

    return await this.createSalesReport(reportData);
  }

  async logActivity(userId: string, action: string, resourceType: string, resourceId?: string, details?: string): Promise<void> {
    await db.insert(activityLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      details,
    });
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
