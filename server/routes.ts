import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import {
  insertTodoSchema,
  insertExpenseSchema,
  defaultTodoCategories,
  insertPushSubscriptionSchema,
  insertProjectSchema,
  insertCustomCategorySchema,
  insertNoteSchema,
  ZodError,
} from "@shared/schema";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import { requireAuth } from "./auth";
import {
  getAuthUrl,
  setCredentials,
  createCalendarEvent,
  syncAllTasks,
} from "./services/calendar";
import { checkAndNotifyTasks } from "./services/notifications";

// Helper function to format Zod validation errors
function formatZodError(err: ZodError): string {
  return err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
}

export async function registerRoutes(app: Express) {
  // Serve Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  /**
   * @swagger
   * /projects:
   *   get:
   *     summary: Get all projects for the current user
   *     tags: [Projects]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of projects
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Project'
   */
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getProjects(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error("Error getting projects:", error);
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  /**
   * @swagger
   * /projects/{id}:
   *   get:
   *     summary: Get a project by ID
   *     tags: [Projects]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Project details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       404:
   *         description: Project not found
   */
  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      // Check if the project belongs to the current user
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(404).json({ error: "Project not found" });
    }
  });

  /**
   * @swagger
   * /projects:
   *   post:
   *     summary: Create a new project
   *     tags: [Projects]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Project'
   *     responses:
   *       200:
   *         description: Created project
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       400:
   *         description: Invalid project data
   */
  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const parsed = insertProjectSchema.safeParse({
        ...req.body,
        userId: req.user!.id
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error });
      }
      
      const project = await storage.createProject(parsed.data);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  /**
   * @swagger
   * /projects/{id}:
   *   patch:
   *     summary: Update a project
   *     tags: [Projects]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Project'
   *     responses:
   *       200:
   *         description: Updated project
   *       403:
   *         description: Forbidden - you don't have access to this project
   *       404:
   *         description: Project not found
   */
  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the project exists and belongs to the current user
      const project = await storage.getProject(id);
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      const updatedProject = await storage.updateProject(id, req.body);
      res.json(updatedProject);
    } catch (error) {
      res.status(404).json({ error: "Project not found" });
    }
  });

  /**
   * @swagger
   * /projects/{id}:
   *   delete:
   *     summary: Delete a project
   *     tags: [Projects]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Project deleted successfully
   *       403:
   *         description: Forbidden - you don't have access to this project
   */
  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the project exists and belongs to the current user
      const project = await storage.getProject(id);
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      await storage.deleteProject(id);
      res.status(204).end();
    } catch (error) {
      res.status(404).json({ error: "Project not found" });
    }
  });

  /**
   * @swagger
   * /projects/{projectId}/categories:
   *   get:
   *     summary: Get all categories for a specific project
   *     tags: [Categories]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: List of categories
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Category'
   *       403:
   *         description: You don't have access to this project
   *       404:
   *         description: Project not found
   */
  app.get("/api/projects/:projectId/categories", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Check if the project exists and belongs to the current user
      const project = await storage.getProject(projectId);
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      const categories = await storage.getCustomCategories(projectId);
      res.json(categories);
    } catch (error) {
      res.status(404).json({ error: "Project not found" });
    }
  });

  /**
   * @swagger
   * /projects/{projectId}/categories:
   *   post:
   *     summary: Create a new category for a specific project
   *     tags: [Categories]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *     responses:
   *       200:
   *         description: Created category
   *       400:
   *         description: Invalid category name or category already exists
   *       403:
   *         description: You don't have access to this project
   *       404:
   *         description: Project not found
   */
  app.post("/api/projects/:projectId/categories", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Check if the project exists and belongs to the current user
      const project = await storage.getProject(projectId);
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Category name is required" });
      }
      
      // Check if this category already exists for this project
      const existingCategories = await storage.getCustomCategories(projectId);
      if (existingCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: "Category already exists for this project" });
      }
      
      const category = await storage.createCustomCategory({ 
        name: name.trim(),
        projectId
      });
      
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  /**
   * @swagger
   * /categories/{name}:
   *   delete:
   *     summary: Delete a category
   *     tags: [Categories]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: name
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Category deleted successfully
   *       400:
   *         description: Cannot delete the Unassigned category
   *       404:
   *         description: Category not found
   */
  app.delete("/api/categories/:name", async (req, res) => {
    const categoryName = decodeURIComponent(req.params.name);
    if (categoryName === "Unassigned") {
      return res
        .status(400)
        .json({ error: "Cannot delete the Unassigned category" });
    }
    const categoryIndex = defaultTodoCategories.findIndex(
      (c) => c.toLowerCase() === categoryName.toLowerCase(),
    );
    if (categoryIndex === -1) {
      return res.status(404).json({ error: "Category not found" });
    }
    try {
      const todos = await storage.getTodos();
      for (const todo of todos) {
        if (todo.category.toLowerCase() === categoryName.toLowerCase()) {
          await storage.updateTodo(todo.id, {
            ...todo,
            category: "Unassigned",
          });
        }
      }
      const expenses = await storage.getExpenses();
      for (const expense of expenses) {
        if (expense.category.toLowerCase() === categoryName.toLowerCase()) {
          await storage.updateExpense(expense.id, {
            ...expense,
            category: "Unassigned",
          });
        }
      }
      (defaultTodoCategories as string[]).splice(categoryIndex, 1);
      res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  /**
   * @swagger
   * /projects/{projectId}/todos:
   *   get:
   *     summary: Get all todos for a specific project
   *     tags: [Todos]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: List of todos
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Todo'
   *       403:
   *         description: You don't have access to this project
   *       404:
   *         description: Project not found
   */
  app.get("/api/projects/:projectId/todos", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Check if the project exists and belongs to the current user
      const project = await storage.getProject(projectId);
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      const todos = await storage.getTodos(projectId);
      res.json(todos);
    } catch (error) {
      res.status(404).json({ error: "Project not found" });
    }
  });

  /**
   * @swagger
   * /todos:
   *   post:
   *     summary: Create a new todo
   *     tags: [Todos]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Todo'
   *     responses:
   *       200:
   *         description: Created todo
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Todo'
   *       400:
   *         description: Invalid todo data
   */
  app.post("/api/todos", async (req, res) => {
    const parsed = insertTodoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const todo = await storage.createTodo(parsed.data);

    // Create calendar event if the user has Google Calendar connected
    if (req.user?.googleAccessToken && todo.dueDate) {
      try {
        await createCalendarEvent(todo);
      } catch (error) {
        console.error("Failed to create calendar event:", error);
        // Continue even if calendar event creation fails
      }
    }

    res.json(todo);
  });

  /**
   * @swagger
   * /todos/{id}:
   *   patch:
   *     summary: Update a todo
   *     tags: [Todos]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Todo'
   *     responses:
   *       200:
   *         description: Updated todo
   *       404:
   *         description: Todo not found
   */
  app.patch("/api/todos/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const todo = await storage.updateTodo(id, req.body);
      res.json(todo);
    } catch (e) {
      res.status(404).json({ error: "Todo not found" });
    }
  });

  /**
   * @swagger
   * /todos/{id}:
   *   delete:
   *     summary: Delete a todo
   *     tags: [Todos]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Todo deleted successfully
   */
  app.delete("/api/todos/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTodo(id);
    res.status(204).end();
  });

  /**
   * @swagger
   * /projects/{projectId}/expenses:
   *   get:
   *     summary: Get all expenses for a specific project
   *     tags: [Expenses]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: List of expenses
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Expense'
   *       403:
   *         description: You don't have access to this project
   *       404:
   *         description: Project not found
   */
  app.get("/api/projects/:projectId/expenses", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Check if the project exists and belongs to the current user
      const project = await storage.getProject(projectId);
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      const expenses = await storage.getExpenses(projectId);
      res.json(expenses);
    } catch (error) {
      res.status(404).json({ error: "Project not found" });
    }
  });

  /**
   * @swagger
   * /expenses:
   *   post:
   *     summary: Create a new expense
   *     tags: [Expenses]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Expense'
   *     responses:
   *       200:
   *         description: Created expense
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Expense'
   *       400:
   *         description: Invalid expense data
   */
  app.post("/api/expenses", async (req, res) => {
    const parsed = insertExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const expense = await storage.createExpense(parsed.data);
    res.json(expense);
  });

  /**
   * @swagger
   * /expenses/{id}:
   *   patch:
   *     summary: Update an expense
   *     tags: [Expenses]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Expense'
   *     responses:
   *       200:
   *         description: Updated expense
   *       404:
   *         description: Expense not found
   */
  app.patch("/api/expenses/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const expense = await storage.updateExpense(id, req.body);
      res.json(expense);
    } catch (e) {
      res.status(404).json({ error: "Expense not found" });
    }
  });

  /**
   * @swagger
   * /expenses/{id}:
   *   delete:
   *     summary: Delete an expense
   *     tags: [Expenses]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Expense deleted successfully
   */
  app.delete("/api/expenses/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteExpense(id);
    res.status(204).end();
  });

  /**
   * @swagger
   * /auth/google:
   *   get:
   *     summary: Start Google OAuth flow
   *     tags: [Auth]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       302:
   *         description: Redirects to Google OAuth consent screen
   */
  app.get("/api/auth/google", requireAuth, (_req, res) => {
    console.log('Starting Google Calendar OAuth flow');
    const authUrl = getAuthUrl();
    res.redirect(authUrl);
  });

  // Add this near the other Google Calendar related routes
  app.post("/api/sync-calendar", requireAuth, async (req, res) => {
    if (!req.user?.googleAccessToken) {
      return res.status(401).json({ error: "Google Calendar not connected" });
    }

    try {
      const todos = await storage.getTodos();
      const result = await syncAllTasks(todos);
      res.json(result);
    } catch (error: any) {
      console.error("Failed to sync calendar:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const parsed = insertPushSubscriptionSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error });
      }

      const subscription = await storage.createPushSubscription(parsed.data);
      res.json(subscription);
    } catch (error) {
      console.error("Failed to save push subscription:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  app.get("/api/push/vapidKey", (_req, res) => {
    res.json({ vapidKey: process.env.VAPID_PUBLIC_KEY });
  });

  // Add a test endpoint to trigger notifications check
  app.post("/api/push/check-notifications", requireAuth, async (req, res) => {
    try {
      await checkAndNotifyTasks();
      res.json({ message: "Notifications check triggered successfully" });
    } catch (error) {
      console.error("Failed to check notifications:", error);
      res.status(500).json({ error: "Failed to check notifications" });
    }
  });

  const server = createServer(app);
  return server;
}