import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, UserRole } from "@shared/schema";
import createMemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);
const MemoryStore = createMemoryStore(session);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function createInitialUser() {
  const existingUser = await storage.getUserByUsername("Carlos");
  if (!existingUser) {
    await storage.createUser({
      username: "Carlos",
      password: await hashPassword("contrasena")
    });
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: "your-secret-key", // In production, use environment variable
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: false, // set to true in production with HTTPS
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'session' // custom name to avoid default 'connect.sid'
  };

  // Enable trust proxy if you're behind a reverse proxy (like on Replit)
  app.set('trust proxy', 1);

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Debug middleware to log session info
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log('Session debug:', {
      id: req.sessionID,
      cookie: req.session.cookie,
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false) => {
      if (err) {
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Internal server error" });
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

// Check if user has access to a project with minimum role
export function requireProjectAccess(minRole: string = UserRole.VIEWER) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const projectId = parseInt(req.params.projectId || req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    
    try {
      // First check if user is the owner (legacy check)
      const project = await storage.getProject(projectId);
      if (project.userId === req.user!.id) {
        return next();
      }
      
      // Otherwise check project membership
      const role = await storage.getUserRole(projectId, req.user!.id);
      if (!role) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      // Check role permissions
      if (minRole === UserRole.OWNER && role !== UserRole.OWNER) {
        return res.status(403).json({ error: "Only the project owner can perform this action" });
      }
      
      if (minRole === UserRole.EDITOR && 
          (role !== UserRole.OWNER && role !== UserRole.EDITOR)) {
        return res.status(403).json({ error: "Editor access required for this action" });
      }
      
      // User has appropriate role
      return next();
    } catch (error) {
      console.error("Error checking project access:", error);
      return res.status(404).json({ error: "Project not found" });
    }
  };
}

// Check if user has access to specific resource (note, todo, expense, etc.)
export function requireResourceAccess(resourceType: string, minRole: string = UserRole.VIEWER) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const resourceId = parseInt(req.params.id);
    if (isNaN(resourceId)) {
      return res.status(400).json({ error: `Invalid ${resourceType} ID` });
    }
    
    try {
      let projectId: number;
      
      // Get the project ID for the requested resource
      switch (resourceType) {
        case 'note':
          const note = await storage.getNoteById(resourceId);
          projectId = note.projectId;
          break;
        case 'todo':
          const todo = await storage.getTodo(resourceId);
          projectId = todo.projectId!;
          break;
        case 'expense':
          const expense = await storage.getExpense(resourceId);
          projectId = expense.projectId!;
          break;
        case 'category':
          const category = await storage.getCategory(resourceId);
          projectId = category.projectId!;
          break;
        default:
          return res.status(400).json({ error: "Invalid resource type" });
      }
      
      // Check project access with the required role
      const checkAccess = requireProjectAccess(minRole);
      req.params.projectId = projectId.toString();
      return checkAccess(req, res, next);
      
    } catch (error) {
      console.error(`Error checking ${resourceType} access:`, error);
      return res.status(404).json({ error: `${resourceType} not found` });
    }
  };
}