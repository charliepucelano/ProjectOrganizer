import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const todoCategories = [
  "Pre-Move",
  "Packing",
  "Moving Day",
  "Post-Move",
  "Utilities",
  "Documentation",
  "Shopping",
  "Repairs"
] as const;

export const expenseCategories = [
  "Purchase",
  "Moving",
  "Repairs",
  "Utilities",
  "Furniture",
  "Appliances",
  "Decor",
  "Other"
] as const;

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category", { enum: todoCategories }).notNull(),
  completed: integer("completed").notNull().default(0),
  dueDate: timestamp("due_date"),
  priority: integer("priority").notNull().default(0),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category: text("category", { enum: expenseCategories }).notNull(),
  date: timestamp("date").notNull(),
});

export const insertTodoSchema = createInsertSchema(todos).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
