import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertTodoSchema, insertExpenseSchema, insertCustomCategorySchema, defaultTodoCategories } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Custom Categories
  app.get("/api/categories", async (_req, res) => {
    const customCategories = await storage.getCustomCategories();
    res.json(customCategories);
  });

  app.post("/api/categories", async (req, res) => {
    const parsed = insertCustomCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    // Check if category already exists (case insensitive)
    const customCategories = await storage.getCustomCategories();
    const categoryExists = customCategories.some(
      c => c.name.toLowerCase() === parsed.data.name.toLowerCase()
    ) || defaultTodoCategories.some(
      c => c.toLowerCase() === parsed.data.name.toLowerCase()
    );

    if (categoryExists) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const category = await storage.createCustomCategory(parsed.data);
    res.json(category);
  });

  app.put("/api/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertCustomCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    // Check if category already exists (case insensitive)
    const customCategories = await storage.getCustomCategories();
    const categoryExists = customCategories.some(
      c => c.id !== id && c.name.toLowerCase() === parsed.data.name.toLowerCase()
    ) || defaultTodoCategories.some(
      c => c.toLowerCase() === parsed.data.name.toLowerCase()
    );

    if (categoryExists) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const category = await storage.updateCustomCategory(id, parsed.data);
    res.json(category);
  });

  app.delete("/api/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);

    // Get the category name before deleting
    const customCategories = await storage.getCustomCategories();
    const categoryToDelete = customCategories.find(c => c.id === id);

    if (categoryToDelete) {
      // Update all todos with this category to "Unassigned"
      await storage.updateTodosWithCategory(categoryToDelete.name, "Unassigned");

      // Delete the category
      await storage.deleteCustomCategory(id);
    }

    res.status(204).end();
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