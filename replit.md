# ROSAE Theatre Management System

## Overview

ROSAE is a comprehensive theatre rental business management system built with a modern full-stack architecture. The application provides detailed booking entry, financial tracking, analytics, employee management, and leave management features for theatre operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with custom ROSAE brand theme (red/black color scheme)
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage

### Key Components

#### Database Schema
- **Users**: Authentication and role management (admin/employee)
- **Bookings**: Theatre booking records with payment tracking
- **Expenses**: Business expense management
- **Leave Applications**: Employee leave request system
- **Activity Logs**: Audit trail for user actions
- **Sessions**: Authentication session storage

#### Authentication System
- Replit OAuth integration with role-based access control
- Session-based authentication with PostgreSQL session store
- Protected routes with middleware validation
- User profile management with Replit user data

#### Business Logic Modules
- **Booking Management**: Theatre reservation system with payment splitting (cash/UPI)
- **Financial Tracking**: Revenue analytics and expense management
- **Analytics Engine**: Dashboard metrics, time slot performance, payment method breakdowns
- **Leave Management**: Employee leave applications with approval workflow
- **User Management**: Admin-only user role management

## Data Flow

### Client-Server Communication
1. **Authentication Flow**: OAuth redirect → Replit verification → session establishment
2. **API Requests**: REST endpoints with JSON payloads, credential-based authentication
3. **Data Validation**: Shared Zod schemas between client and server
4. **Error Handling**: Centralized error handling with toast notifications

### Database Operations
1. **Connection Management**: Neon serverless connection pooling
2. **Query Execution**: Drizzle ORM with type-safe queries
3. **Transaction Handling**: Atomic operations for financial records
4. **Migration Strategy**: Drizzle Kit for schema migrations

## External Dependencies

### Core Infrastructure
- **Database**: Neon Database (serverless PostgreSQL)
- **Authentication**: Replit Identity Provider
- **Deployment**: Designed for Replit hosting environment

### Major Libraries
- **UI Framework**: React ecosystem with Radix UI primitives
- **Styling**: Tailwind CSS with PostCSS processing
- **Charts**: Recharts for analytics visualization
- **Form Validation**: Zod schema validation
- **Date Handling**: date-fns for date operations

### Development Tools
- **Build System**: Vite with TypeScript support
- **Code Quality**: TypeScript strict mode configuration
- **Development Server**: Express with Vite middleware integration

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds to `dist/public` directory
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Static Assets**: Served by Express in production mode

### Environment Configuration
- **Database URL**: Required environment variable for Neon connection
- **Session Secret**: Required for session encryption
- **Replit Integration**: Automatic configuration in Replit environment

### Development Workflow
- **Local Development**: TSX for TypeScript execution with hot reload
- **Database Management**: Drizzle Kit for schema pushes and migrations
- **Error Monitoring**: Runtime error overlay in development mode

The architecture prioritizes type safety, developer experience, and scalability while maintaining simplicity for a theatre management use case. The system uses modern web standards and is optimized for the Replit deployment environment.