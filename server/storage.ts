import { Todo, InsertTodo, Expense, InsertExpense, User, InsertUser, CustomCategory, InsertCustomCategory, PushSubscription, InsertPushSubscription } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Todos
  getTodos(): Promise<Todo[]>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, todo: Partial<Todo>): Promise<Todo>;
  deleteTodo(id: number): Promise<void>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<Expense>): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Users
  getUser(id: number): Promise<User>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, update: Partial<User>): Promise<User>;  
  getUsers(): Promise<User[]>; // Add getUsers method

  // Categories
  getCustomCategories(): Promise<CustomCategory[]>;
  createCustomCategory(category: InsertCustomCategory): Promise<CustomCategory>;
  updateCustomCategory(id: number, data: InsertCustomCategory): Promise<CustomCategory>;
  deleteCustomCategory(id: number): Promise<void>;
  updateTodosWithCategory(oldCategory: string, newCategory: string): Promise<void>;

  // Session store
  sessionStore: session.Store;

  // Push notification methods
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptions(userId: number): Promise<PushSubscription[]>;
  updateLastNotified(subscriptionId: number, date: Date): Promise<void>;
}

export class MemStorage implements IStorage {
  private todos: Map<number, Todo>;
  private expenses: Map<number, Expense>;
  private users: Map<number, User>;
  private categories: Map<number, CustomCategory>;
  private todoId: number;
  private expenseId: number;
  private userId: number;
  private categoryId: number;
  private pushSubscriptions: Map<number, PushSubscription>;
  private pushSubscriptionId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.todos = new Map();
    this.expenses = new Map();
    this.users = new Map();
    this.categories = new Map();
    this.todoId = 1;
    this.expenseId = 1;
    this.userId = 1;
    this.categoryId = 1;
    this.pushSubscriptions = new Map();
    this.pushSubscriptionId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });

    // Initialize with predefined categories
    this.categories.set(this.categoryId++, { id: this.categoryId -1, name: "Financial Obligations" });
    this.categories.set(this.categoryId++, { id: this.categoryId -1, name: "Moving" });
    this.categories.set(this.categoryId++, { id: this.categoryId -1, name: "Utilities" });
    this.categories.set(this.categoryId++, { id: this.categoryId -1, name: "Improvements" });
    this.categories.set(this.categoryId++, { id: this.categoryId -1, name: "Furniture" });
    this.categories.set(this.categoryId++, { id: this.categoryId -1, name: "Unassigned" });
  }


  async getUser(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser = { ...user, id, googleAccessToken: null, googleRefreshToken: null };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, update: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, ...update };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getTodos(): Promise<Todo[]> {
    return Array.from(this.todos.values());
  }

  async createTodo(todo: InsertTodo): Promise<Todo> {
    const id = this.todoId++;
    const newTodo = { 
      ...todo,
      id,
      description: todo.description || null,
      category: todo.category || "Unassigned",
      dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
      estimatedAmount: todo.estimatedAmount || null,
      completed: todo.completed || 0,
      priority: todo.priority || 0,
      hasAssociatedExpense: todo.hasAssociatedExpense || 0
    };
    this.todos.set(id, newTodo);
    return newTodo;
  }

  async updateTodo(id: number, update: Partial<Todo>): Promise<Todo> {
    const todo = this.todos.get(id);
    if (!todo) throw new Error("Todo not found");

    const updatedTodo = { ...todo, ...update };
    this.todos.set(id, updatedTodo);
    return updatedTodo;
  }

  async deleteTodo(id: number): Promise<void> {
    this.todos.delete(id);
  }

  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.expenseId++;
    const newExpense = { 
      ...expense,
      id,
      date: new Date(expense.date),
      todoId: expense.todoId || null,
      completedAt: expense.completedAt ? new Date(expense.completedAt) : null,
      isBudget: expense.isBudget || 0
    };
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async updateExpense(id: number, update: Partial<Expense>): Promise<Expense> {
    const expense = this.expenses.get(id);
    if (!expense) throw new Error("Expense not found");

    const updatedExpense = { ...expense, ...update };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<void> {
    this.expenses.delete(id);
  }

  async getCustomCategories(): Promise<CustomCategory[]> {
    return Array.from(this.categories.values());
  }

  async createCustomCategory(category: InsertCustomCategory): Promise<CustomCategory> {
    const id = this.categoryId++;
    const newCategory = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCustomCategory(id: number, data: InsertCustomCategory): Promise<CustomCategory> {
    const category = this.categories.get(id);
    if (!category) throw new Error("Category not found");
    const updatedCategory = { ...category, ...data };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCustomCategory(id: number): Promise<void> {
    const categoryToDelete = this.categories.get(id);
    if (categoryToDelete) {
        this.categories.delete(id);
        //reassign todos
        this.reassignTodos(categoryToDelete.name, "Unassigned");
    }

  }

  private reassignTodos(oldCategory: string, newCategory: string): void{
      for (const [key, value] of this.todos) {
          if(value.category === oldCategory){
              this.updateTodo(key, {category: newCategory});
          }
      }
  }

  async updateTodosWithCategory(oldCategory: string, newCategory: string): Promise<void> {
    for (const [id, todo] of this.todos) {
      if (todo.category === oldCategory) {
        await this.updateTodo(id, { category: newCategory });
      }
    }
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const id = this.pushSubscriptionId++;
    const newSubscription = {
      ...subscription,
      id,
      lastNotified: subscription.lastNotified ? new Date(subscription.lastNotified) : null
    };
    this.pushSubscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async getPushSubscriptions(userId: number): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values())
      .filter(sub => sub.userId === userId);
  }

  async updateLastNotified(subscriptionId: number, date: Date): Promise<void> {
    const subscription = this.pushSubscriptions.get(subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    this.pushSubscriptions.set(subscriptionId, {
      ...subscription,
      lastNotified: date
    });
  }
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

export const storage = new MemStorage();