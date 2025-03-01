import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertTodoSchema, insertExpenseSchema, defaultTodoCategories } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Categories
  app.get("/api/categories", async (_req, res) => {
    res.json(defaultTodoCategories);
  });

  app.post("/api/categories", async (req, res) => {
    const { name } = req.body;

    // Validate name is provided
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check if category already exists (case insensitive)
    if (defaultTodoCategories.some(c => c.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: "Category already exists" });
    }

    // Add to the set of categories
    (defaultTodoCategories as string[]).push(name.trim());
    res.json({ name: name.trim() });
  });

  // Todos
  app.get("/api/todos", async (_req, res) => {
    const todos = await storage.getTodos();
    res.json(todos);
  });

  app.post("/api/todos", async (req, res) => {
    const parsed = insertTodoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const todo = await storage.createTodo(parsed.data);
    res.json(todo);
  });

  app.patch("/api/todos/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const todo = await storage.updateTodo(id, req.body);
      res.json(todo);
    } catch (e) {
      res.status(404).json({ error: "Todo not found" });
    }
  });

  app.delete("/api/todos/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTodo(id);
    res.status(204).end();
  });

  // Expenses
  app.get("/api/expenses", async (_req, res) => {
    const expenses = await storage.getExpenses();
    res.json(expenses);
  });

  app.post("/api/expenses", async (req, res) => {
    const parsed = insertExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const expense = await storage.createExpense(parsed.data);
    res.json(expense);
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const expense = await storage.updateExpense(id, req.body);
      res.json(expense);
    } catch (e) {
      res.status(404).json({ error: "Expense not found" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteExpense(id);
    res.status(204).end();
  });

  return createServer(app);
}