import { pgTable, text, serial, integer, timestamp, real, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod";

export const defaultCategories = [
  "Unassigned", // Default category that cannot be deleted
  "Financial Obligations",
  "Moving",
  "Utilities",
  "Furniture"
] as const;

// Define user roles for project access
export const UserRole = {
  OWNER: "owner",
  EDITOR: "editor", 
  VIEWER: "viewer"
} as const;

// Use the same categories for todos and expenses
export const defaultTodoCategories = defaultCategories;
export const defaultExpenseCategories = defaultCategories;

// Add user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
});

// Projects table - note we keep the userId field for backwards compatibility
// and to indicate the "owner" of the project
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Project members table for tracking who has access to which projects
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default(UserRole.VIEWER),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => {
  return {
    userProjectIdx: uniqueIndex("user_project_idx").on(table.userId, table.projectId),
  };
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
  projectId: integer("project_id").references(() => projects.id),
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
  projectId: integer("project_id").references(() => projects.id),
});

// Custom categories now belong to a project
export const customCategories = pgTable("custom_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  projectId: integer("project_id").references(() => projects.id),
});

// Notes table for project-level notes
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array(),
  markdownContent: text("markdown_content"),
  attachments: jsonb("attachments"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Add after the existing imports
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  lastNotified: timestamp("last_notified"),
});

// Create a project schema with validation
export const insertProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  userId: z.number(),
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
  projectId: z.number().nullable(),
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
  projectId: z.number().nullable(),
});

// Custom category schema
export const insertCustomCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  projectId: z.number().nullable(),
});

// Add user validation schema
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Create note schema with validation
export const insertNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  tags: z.array(z.string()).optional(),
  markdownContent: z.string().optional(),
  attachments: z.any().optional(),
  projectId: z.number().int(),
});

// Project member schema for inviting/adding users to projects
export const insertProjectMemberSchema = z.object({
  projectId: z.number().int(),
  userId: z.number().int(),
  role: z.enum([UserRole.OWNER, UserRole.EDITOR, UserRole.VIEWER]).default(UserRole.VIEWER),
});

// Add to the existing types section
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CustomCategory = typeof customCategories.$inferSelect;
export type InsertCustomCategory = z.infer<typeof insertCustomCategorySchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;

// Add the insert schema
export const insertPushSubscriptionSchema = z.object({
  userId: z.number(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  lastNotified: z.string().nullable(),
});