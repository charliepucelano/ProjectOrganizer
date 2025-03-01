import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const defaultTodoCategories = [
  "Pre-Move",
  "Packing",
  "Moving Day",
  "Post-Move",
  "Utilities",
  "Documentation",
  "Shopping",
  "Repairs"
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

export const customCategories = pgTable("custom_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
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

// Create a base todo schema with proper date validation
const baseTodoSchema = {
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable(),
  category: z.string().min(1, "Category is required"),
  completed: z.number().default(0),
  dueDate: z.string().nullable().transform(val => val ? new Date(val).toISOString() : null),
  priority: z.number().default(0),
  hasAssociatedExpense: z.number().default(0),
  estimatedAmount: z.number().nullable(),
};

// Create a base expense schema with proper date validation
const baseExpenseSchema = {
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0, "Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  date: z.string().transform(val => new Date(val).toISOString()),
  todoId: z.number().nullable(),
  isBudget: z.number().default(0),
  completedAt: z.string().nullable().transform(val => val ? new Date(val).toISOString() : null),
};

// Use the base schemas for both insert and update operations
export const insertTodoSchema = z.object(baseTodoSchema);
export const insertExpenseSchema = z.object(baseExpenseSchema);
export const insertCustomCategorySchema = createInsertSchema(customCategories).omit({ id: true });

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type CustomCategory = typeof customCategories.$inferSelect;
export type InsertCustomCategory = z.infer<typeof insertCustomCategorySchema>;