import { Todo, InsertTodo, Expense, InsertExpense, User, InsertUser, CustomCategory, InsertCustomCategory, PushSubscription, InsertPushSubscription, Project, InsertProject } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Projects
  getProjects(userId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Todos
  getTodos(projectId: number): Promise<Todo[]>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, todo: Partial<Todo>): Promise<Todo>;
  deleteTodo(id: number): Promise<void>;

  // Expenses
  getExpenses(projectId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<Expense>): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Users
  getUser(id: number): Promise<User>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, update: Partial<User>): Promise<User>;  
  getUsers(): Promise<User[]>; 

  // Categories
  getCustomCategories(projectId: number): Promise<CustomCategory[]>;
  createCustomCategory(category: InsertCustomCategory): Promise<CustomCategory>;
  updateCustomCategory(id: number, data: InsertCustomCategory): Promise<CustomCategory>;
  deleteCustomCategory(id: number): Promise<void>;
  updateTodosWithCategory(projectId: number, oldCategory: string, newCategory: string): Promise<void>;

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
  private projects: Map<number, Project>;
  private todoId: number;
  private expenseId: number;
  private userId: number;
  private categoryId: number;
  private projectId: number;
  private pushSubscriptions: Map<number, PushSubscription>;
  private pushSubscriptionId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.todos = new Map();
    this.expenses = new Map();
    this.users = new Map();
    this.categories = new Map();
    this.projects = new Map();
    this.todoId = 1;
    this.expenseId = 1;
    this.userId = 1;
    this.categoryId = 1;
    this.projectId = 1;
    this.pushSubscriptions = new Map();
    this.pushSubscriptionId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // Project methods
  async getProjects(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter(project => project.userId === userId);
  }

  async getProject(id: number): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) throw new Error("Project not found");
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const now = new Date();
    const newProject = { 
      ...project, 
      id, 
      createdAt: now, 
      updatedAt: now,
      description: project.description || null
    };
    this.projects.set(id, newProject);
    
    // Initialize default categories for this project
    ["Financial Obligations", "Moving", "Utilities", "Improvements", "Furniture", "Unassigned"].forEach(name => {
      this.createCustomCategory({ name, projectId: id });
    });
    
    return newProject;
  }

  async updateProject(id: number, update: Partial<Project>): Promise<Project> {
    const project = await this.getProject(id);
    const updatedProject = { 
      ...project, 
      ...update,
      updatedAt: new Date()
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    // Delete all associated todos, expenses, and categories
    const todosToDelete = Array.from(this.todos.values())
      .filter(todo => todo.projectId === id);
    
    const expensesToDelete = Array.from(this.expenses.values())
      .filter(expense => expense.projectId === id);
      
    const categoriesToDelete = Array.from(this.categories.values())
      .filter(category => category.projectId === id);
    
    // Delete todos
    todosToDelete.forEach(todo => this.todos.delete(todo.id));
    
    // Delete expenses
    expensesToDelete.forEach(expense => this.expenses.delete(expense.id));
    
    // Delete categories
    categoriesToDelete.forEach(category => this.categories.delete(category.id));
    
    // Finally delete the project
    this.projects.delete(id);
  }

  // User methods
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

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Todo methods
  async getTodos(projectId: number): Promise<Todo[]> {
    return Array.from(this.todos.values())
      .filter(todo => todo.projectId === projectId);
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
      hasAssociatedExpense: todo.hasAssociatedExpense || 0,
      projectId: todo.projectId || null
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

  // Expense methods
  async getExpenses(projectId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => expense.projectId === projectId);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.expenseId++;
    const newExpense = { 
      ...expense,
      id,
      date: new Date(expense.date),
      todoId: expense.todoId || null,
      completedAt: expense.completedAt ? new Date(expense.completedAt) : null,
      isBudget: expense.isBudget || 0,
      projectId: expense.projectId || null
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

  // Category methods
  async getCustomCategories(projectId: number): Promise<CustomCategory[]> {
    return Array.from(this.categories.values())
      .filter(category => category.projectId === projectId);
  }

  async createCustomCategory(category: InsertCustomCategory): Promise<CustomCategory> {
    const id = this.categoryId++;
    const newCategory = { 
      ...category, 
      id,
      projectId: category.projectId || null
    };
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
      // Reassign todos within the same project
      if (categoryToDelete.projectId) {
        this.reassignTodos(categoryToDelete.projectId, categoryToDelete.name, "Unassigned");
      }
    }
  }

  private reassignTodos(projectId: number, oldCategory: string, newCategory: string): void {
    for (const [key, value] of this.todos) {
      if (value.projectId === projectId && value.category === oldCategory) {
        this.updateTodo(key, {category: newCategory});
      }
    }
  }

  async updateTodosWithCategory(projectId: number, oldCategory: string, newCategory: string): Promise<void> {
    for (const [id, todo] of this.todos) {
      if (todo.projectId === projectId && todo.category === oldCategory) {
        await this.updateTodo(id, { category: newCategory });
      }
    }
  }

  // Push notification methods
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
}

export const storage = new MemStorage();