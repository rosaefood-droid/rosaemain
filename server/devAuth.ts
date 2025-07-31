import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Development mode authentication bypass
export async function setupDevAuth(app: Express) {
  // Development login endpoint
  app.get("/api/login", (req, res) => {
    // In dev mode, redirect to a dev login page that sets up a session
    res.redirect("/api/dev-login");
  });

  app.get("/api/dev-login", async (req, res) => {
    try {
      // Create or get the admin user
      let adminUser = await storage.getUserByEmail("rosaeleisure@gmail.com");
      
      if (!adminUser) {
        adminUser = await storage.upsertUser({
          id: "34316921", // Fixed ID for development
          email: "rosaeleisure@gmail.com",
          firstName: "ROSAE",
          lastName: "Admin",
          profileImageUrl: null,
        });
      }

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
  // In development mode, always create an admin user session
  try {
    let adminUser = await storage.getUserByEmail("rosaeleisure@gmail.com");
    
    if (!adminUser) {
      adminUser = await storage.upsertUser({
        id: "34316921",
        email: "rosaeleisure@gmail.com", 
        firstName: "ROSAE",
        lastName: "Admin",
        profileImageUrl: null,
      });
    }

    // Always attach the admin user for development
    (req as any).user = {
      claims: {
        sub: adminUser.id,
        email: adminUser.email,
        first_name: adminUser.firstName,
        last_name: adminUser.lastName,
        profile_image_url: adminUser.profileImageUrl,
      },
      access_token: "dev-token",
      refresh_token: "dev-refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    next();
  } catch (error) {
    console.error("Dev auth error:", error);
    res.status(500).json({ message: "Authentication setup failed" });
  }
};