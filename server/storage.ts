import {
  users,
  bookings,
  expenses,
  leaveApplications,
  activityLogs,
  type User,
  type UpsertUser,
  type InsertBooking,
  type Booking,
  type InsertExpense,
  type Expense,
  type InsertLeaveApplication,
  type LeaveApplication,
  type ActivityLog,
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
  
  // Expense operations
  createExpense(expense: InsertExpense): Promise<Expense>;
  getAllExpenses(limit?: number): Promise<Expense[]>;
  getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]>;
  
  // Leave operations
  createLeaveApplication(leave: InsertLeaveApplication): Promise<LeaveApplication>;
  getLeaveApplications(): Promise<LeaveApplication[]>;
  updateLeaveStatus(id: string, status: string, reviewedBy: string): Promise<LeaveApplication>;
  
  // Analytics operations
  getDailyRevenue(days: number): Promise<Array<{ date: string; revenue: number; bookings: number }>>;
  getPaymentMethodBreakdown(): Promise<{ cash: number; upi: number }>;
  getTimeSlotPerformance(): Promise<Array<{ timeSlot: string; bookings: number; revenue: number }>>;
  
  // Activity logging
  logActivity(userId: string, action: string, resourceType: string, resourceId?: string, details?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
      .values(booking)
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
      .values(expense)
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

  async logActivity(userId: string, action: string, resourceType: string, resourceId?: string, details?: string): Promise<void> {
    await db.insert(activityLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      details,
    });
  }
}

export const storage = new DatabaseStorage();
