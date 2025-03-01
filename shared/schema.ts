import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { z } from "zod";

export const defaultTodoCategories = [
  "Unassigned",
  "Financial Obligations",
  "Moving",
  "Utilities",
  "Improvements",
  "Furniture"
] as const;

export const defaultExpenseCategories = [
  "Purchase",
  "Moving",
  "Repairs",
  "Utilities",
  "Furniture",
  "Appliances",
  "Decor",
  "Other"
] as const;

// Add user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
});

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("Unassigned"),
  completed: integer("completed").notNull().default(0),
  dueDate: timestamp("due_date"),
  priority: integer("priority").notNull().default(0),
  hasAssociatedExpense: integer("has_associated_expense").notNull().default(0),
  estimatedAmount: real("estimated_amount"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
  todoId: integer("todo_id").references(() => todos.id),
  isBudget: integer("is_budget").notNull().default(0),
  completedAt: timestamp("completed_at"),
});

// Create a base todo schema with proper validation
export const insertTodoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable(),
  category: z.string().default("Unassigned"),
  completed: z.number().default(0),
  dueDate: z.string().nullable(),
  priority: z.number().default(0),
  hasAssociatedExpense: z.number().default(0),
  estimatedAmount: z.number().nullable(),
});

// Create a base expense schema with proper validation
export const insertExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0, "Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  date: z.string(),
  todoId: z.number().nullable(),
  isBudget: z.number().default(0),
  completedAt: z.string().nullable(),
});

// Add user validation schema
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;