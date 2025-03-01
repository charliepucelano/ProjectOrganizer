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

export const insertTodoSchema = createInsertSchema(todos).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export const insertCustomCategorySchema = createInsertSchema(customCategories).omit({ id: true });

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type CustomCategory = typeof customCategories.$inferSelect;
export type InsertCustomCategory = z.infer<typeof insertCustomCategorySchema>;