import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth, createInitialUser, requireAuth } from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup authentication first
setupAuth(app);

// Create initial user
createInitialUser().catch((err) => {
  console.error("Failed to create initial user:", err);
});

// Verify Google OAuth credentials
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("ERROR: Missing required Google OAuth credentials");
} else {
  console.log("Google OAuth credentials found");
}

// List of public routes that don't require authentication
const publicRoutes = [
  '/api/login',
  '/api/logout',
  '/api/user',
  '/api/auth/google/callback',
  '/api/auth/google'
];

// Authentication middleware for protected routes
app.use((req, res, next) => {
  // Skip auth check for public routes
  if (publicRoutes.some(route => req.originalUrl.startsWith(route))) {
    console.log('Public route accessed:', req.originalUrl);
    if (req.originalUrl.startsWith('/api/auth/google/callback')) {
      console.log('Google callback debug info:', {
        session: req.session,
        isAuthenticated: req.isAuthenticated(),
        user: req.user,
        cookies: req.cookies
      });
    }
    return next();
  }

  // Only require auth for API routes
  if (req.originalUrl.startsWith('/api')) {
    console.log('Protected route accessed:', req.originalUrl);
    return requireAuth(req, res, next);
  }

  // Non-API routes don't require auth
  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Try to serve the app on port 5000, fall back to other ports if needed
  const tryPort = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      server
        .listen({
          port,
          host: "0.0.0.0",
          reusePort: true,
        })
        .on("listening", () => {
          log(`serving on port ${port}`);
          resolve(port);
        })
        .on("error", (err: any) => {
          if (err.code === "EADDRINUSE") {
            log(`Port ${port} is busy, trying ${port + 1}...`);
            server.close();
            // Try the next port
            tryPort(port + 1)
              .then(resolve)
              .catch(reject);
          } else {
            reject(err);
          }
        });
    });
  };

  // Start with port 5000 and try alternatives if needed
  tryPort(5000).catch((err) => {
    log(`Failed to start server: ${err.message}`);
    process.exit(1);
  });
})();