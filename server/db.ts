import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";

// Use SQLite for local development
const sqlite = new Database('rosae.db');
export const db = drizzle(sqlite, { schema });

// Initialize database tables
export function initializeDatabase() {
  // Drop existing tables to ensure clean schema
  sqlite.exec(`
    DROP TABLE IF EXISTS sales_reports;
    DROP TABLE IF EXISTS calendar_events;
    DROP TABLE IF EXISTS activity_logs;
    DROP TABLE IF EXISTS customer_tickets;
    DROP TABLE IF EXISTS leave_applications;
    DROP TABLE IF EXISTS expenses;
    DROP TABLE IF EXISTS bookings;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS sessions;
  `);
  
  // Create tables with correct schema
  sqlite.exec(`
         CREATE TABLE IF NOT EXISTS users (
       id TEXT PRIMARY KEY,
       email TEXT UNIQUE NOT NULL,
       first_name TEXT,
       last_name TEXT,
       profile_image_url TEXT,
       password_hash TEXT,
       role TEXT DEFAULT 'user',
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      theatre_name TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      guests INTEGER NOT NULL,
      phone_number TEXT,
      total_amount REAL NOT NULL,
      cash_amount REAL NOT NULL,
      upi_amount REAL NOT NULL,
      snacks_amount REAL DEFAULT 0,
      snacks_cash REAL DEFAULT 0,
      snacks_upi REAL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS leave_applications (
      id TEXT PRIMARY KEY,
      employee_name TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS customer_tickets (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      issue TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

         CREATE TABLE IF NOT EXISTS activity_logs (
       id TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       action TEXT NOT NULL,
       resource_type TEXT NOT NULL,
       resource_id TEXT,
       details TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id)
     );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      google_calendar_event_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      status TEXT DEFAULT 'confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );

    CREATE TABLE IF NOT EXISTS sales_reports (
      id TEXT PRIMARY KEY,
      report_date TEXT NOT NULL,
      total_revenue REAL NOT NULL,
      food_sales REAL DEFAULT 0,
      screen_sales REAL DEFAULT 0,
      total_bookings INTEGER DEFAULT 0,
      total_guests INTEGER DEFAULT 0,
      avg_booking_value REAL DEFAULT 0,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);
}