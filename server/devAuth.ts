import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";

// Development mode authentication bypass
export async function setupDevAuth(app: Express) {
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

  // Development login endpoint
  app.get("/api/login", (req, res) => {
    // In dev mode, redirect to a dev login page that sets up a session
    res.redirect("/api/dev-login");
  });

  app.get("/api/dev-login", async (req, res) => {
    try {
      // Create a simple admin user without database dependency
      const adminUser = {
        id: "34316921",
        email: "rosaeleisure@gmail.com",
        firstName: "ROSAE",
        lastName: "Admin",
        profileImageUrl: null,
      };

      // Set up a mock session
      (req as any).session.user = {
        claims: {
          sub: adminUser.id,
          email: adminUser.email,
          first_name: adminUser.firstName,
          last_name: adminUser.lastName,
          profile_image_url: adminUser.profileImageUrl,
        },
        access_token: "dev-token",
        refresh_token: "dev-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      res.redirect("/");
    } catch (error) {
      console.error("Dev login error:", error);
      res.status(500).json({ message: "Dev login failed" });
    }
  });

  app.get("/api/logout", (req, res) => {
    if ((req as any).session) {
      (req as any).session.destroy();
    }
    res.redirect("/");
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check if user is authenticated via session
  const sessionUser = (req as any).session?.user;
  
  if (!sessionUser) {
    return res.status(401).json({ message: "Unauthorized - Please login" });
  }

  // Check if session is expired
  const now = Math.floor(Date.now() / 1000);
  if (sessionUser.expires_at && now > sessionUser.expires_at) {
    (req as any).session.destroy();
    return res.status(401).json({ message: "Session expired - Please login again" });
  }

  // For development, always allow access if session exists
  (req as any).user = sessionUser;
  next();
};