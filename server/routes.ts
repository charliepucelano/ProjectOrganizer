import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertTodoSchema, insertExpenseSchema, defaultTodoCategories } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Categories
  app.get("/api/categories", async (_req, res) => {
    res.json([...defaultTodoCategories]);
  });

  app.post("/api/categories", async (req, res) => {
    const { name } = req.body;

    // Validate name is provided
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const trimmedName = name.trim();

    // Check if category already exists (case insensitive)
    if (defaultTodoCategories.some(c => c.toLowerCase() === trimmedName.toLowerCase())) {
      return res.status(400).json({ error: "Category already exists" });
    }

    // Add to the set of categories
    (defaultTodoCategories as string[]).push(trimmedName);
    res.json({ name: trimmedName });
  });

  app.delete("/api/categories/:name", async (req, res) => {
    const categoryName = decodeURIComponent(req.params.name);

    // Don't allow deleting "Unassigned"
    if (categoryName === "Unassigned") {
      return res.status(400).json({ error: "Cannot delete the Unassigned category" });
    }

    // Check if category exists
    const categoryIndex = defaultTodoCategories.findIndex(
      c => c.toLowerCase() === categoryName.toLowerCase()
    );

    if (categoryIndex === -1) {
      return res.status(404).json({ error: "Category not found" });
    }

    try {
      // First, update all todos with this category to "Unassigned"
      const todos = await storage.getTodos();
      for (const todo of todos) {
        if (todo.category.toLowerCase() === categoryName.toLowerCase()) {
          await storage.updateTodo(todo.id, {
            ...todo,
            category: "Unassigned"
          });
        }
      }

      // Update all expenses with this category to "Other"
      const expenses = await storage.getExpenses();
      for (const expense of expenses) {
        if (expense.category.toLowerCase() === categoryName.toLowerCase()) {
          await storage.updateExpense(expense.id, {
            ...expense,
            category: "Other"
          });
        }
      }

      // Finally, remove the category from the list
      (defaultTodoCategories as string[]).splice(categoryIndex, 1);

      res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: "Failed to delete category" });
    }
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