import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import {
  insertTodoSchema,
  insertExpenseSchema,
  defaultTodoCategories,
} from "@shared/schema";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import { requireAuth } from "./auth";
import {
  getAuthUrl,
  setCredentials,
  createCalendarEvent,
} from "./services/calendar";

export async function registerRoutes(app: Express) {
  // Serve Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  /**
   * @swagger
   * /categories:
   *   get:
   *     summary: Get all categories
   *     tags: [Categories]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of categories
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: string
   */
  app.get("/api/categories", async (_req, res) => {
    res.json([...defaultTodoCategories]);
  });

  /**
   * @swagger
   * /categories:
   *   post:
   *     summary: Create a new category
   *     tags: [Categories]
   *     security:
   *       - cookieAuth: []
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
   */
  app.post("/api/categories", async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const trimmedName = name.trim();
    if (
      defaultTodoCategories.some(
        (c) => c.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      return res.status(400).json({ error: "Category already exists" });
    }
    (defaultTodoCategories as string[]).push(trimmedName);
    res.json({ name: trimmedName });
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
            category: "Other",
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
   * /todos:
   *   get:
   *     summary: Get all todos
   *     tags: [Todos]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of todos
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Todo'
   */
  app.get("/api/todos", async (_req, res) => {
    const todos = await storage.getTodos();
    res.json(todos);
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
   * /expenses:
   *   get:
   *     summary: Get all expenses
   *     tags: [Expenses]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of expenses
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Expense'
   */
  app.get("/api/expenses", async (_req, res) => {
    const expenses = await storage.getExpenses();
    res.json(expenses);
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

  return createServer(app);
}