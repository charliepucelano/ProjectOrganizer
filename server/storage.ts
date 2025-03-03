import { Todo, InsertTodo, Expense, InsertExpense, User, InsertUser, CustomCategory, InsertCustomCategory, PushSubscription, InsertPushSubscription, Project, InsertProject, Note, InsertNote, ProjectMember, InsertProjectMember, UserRole } from "@shared/schema";
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
  
  // Project Members (for sharing)
  getProjectMembers(projectId: number): Promise<ProjectMember[]>;
  getProjectMember(projectId: number, userId: number): Promise<ProjectMember | null>;
  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  updateProjectMemberRole(projectId: number, userId: number, role: string): Promise<ProjectMember>;
  removeProjectMember(projectId: number, userId: number): Promise<void>;
  isUserProjectMember(projectId: number, userId: number): Promise<boolean>;
  getUserRole(projectId: number, userId: number): Promise<string | null>;
  getSharedProjects(userId: number): Promise<Project[]>;

  // Todos
  getTodos(projectId: number): Promise<Todo[]>;
  getTodo(id: number): Promise<Todo>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, todo: Partial<Todo>): Promise<Todo>;
  deleteTodo(id: number): Promise<void>;

  // Expenses
  getExpenses(projectId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense>;
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
  getCategory(id: number): Promise<CustomCategory>;
  createCustomCategory(category: InsertCustomCategory): Promise<CustomCategory>;
  updateCustomCategory(id: number, data: InsertCustomCategory): Promise<CustomCategory>;
  deleteCustomCategory(id: number): Promise<void>;
  updateTodosWithCategory(projectId: number, oldCategory: string, newCategory: string): Promise<void>;

  // Notes
  getNotes(projectId: number): Promise<Note[]>;
  getNoteById(id: number): Promise<Note>;
  getNotesByTag(projectId: number, tag: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<Note>): Promise<Note>;
  deleteNote(id: number): Promise<void>;
  searchNotes(projectId: number, query: string): Promise<Note[]>;

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
  private notes: Map<number, Note>;
  private projectMembers: Map<number, ProjectMember>;
  private todoId: number;
  private expenseId: number;
  private userId: number;
  private categoryId: number;
  private projectId: number;
  private noteId: number;
  private projectMemberId: number;
  private pushSubscriptions: Map<number, PushSubscription>;
  private pushSubscriptionId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.todos = new Map();
    this.expenses = new Map();
    this.users = new Map();
    this.categories = new Map();
    this.projects = new Map();
    this.notes = new Map();
    this.projectMembers = new Map();
    this.todoId = 1;
    this.expenseId = 1;
    this.userId = 1;
    this.categoryId = 1;
    this.projectId = 1;
    this.noteId = 1;
    this.projectMemberId = 1;
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
    
    // Add the creator as an owner of the project
    this.addProjectMember({
      projectId: id,
      userId: project.userId,
      role: UserRole.OWNER
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
    // Delete all associated todos, expenses, categories, notes, and members
    const todosToDelete = Array.from(this.todos.values())
      .filter(todo => todo.projectId === id);
    
    const expensesToDelete = Array.from(this.expenses.values())
      .filter(expense => expense.projectId === id);
      
    const categoriesToDelete = Array.from(this.categories.values())
      .filter(category => category.projectId === id);
      
    const notesToDelete = Array.from(this.notes.values())
      .filter(note => note.projectId === id);
      
    const membersToDelete = Array.from(this.projectMembers.values())
      .filter(member => member.projectId === id);
    
    // Delete todos
    todosToDelete.forEach(todo => this.todos.delete(todo.id));
    
    // Delete expenses
    expensesToDelete.forEach(expense => this.expenses.delete(expense.id));
    
    // Delete categories
    categoriesToDelete.forEach(category => this.categories.delete(category.id));
    
    // Delete notes
    notesToDelete.forEach(note => this.notes.delete(note.id));
    
    // Delete project members
    membersToDelete.forEach(member => this.projectMembers.delete(member.id));
    
    // Finally delete the project
    this.projects.delete(id);
  }
  
  // Project Member methods for sharing
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    return Array.from(this.projectMembers.values())
      .filter(member => member.projectId === projectId);
  }
  
  async getProjectMember(projectId: number, userId: number): Promise<ProjectMember | null> {
    const members = await this.getProjectMembers(projectId);
    return members.find(member => member.userId === userId) || null;
  }
  
  async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    // Check if this user is already a member of the project
    const existingMember = await this.getProjectMember(member.projectId, member.userId);
    if (existingMember) {
      // Update their role if they already exist
      return this.updateProjectMemberRole(member.projectId, member.userId, member.role);
    }
    
    const id = this.projectMemberId++;
    const now = new Date();
    const newMember: ProjectMember = {
      ...member,
      id,
      joinedAt: now
    };
    
    this.projectMembers.set(id, newMember);
    return newMember;
  }
  
  async updateProjectMemberRole(projectId: number, userId: number, role: string): Promise<ProjectMember> {
    const member = await this.getProjectMember(projectId, userId);
    if (!member) {
      throw new Error("Project member not found");
    }
    
    const updatedMember = {
      ...member,
      role
    };
    
    this.projectMembers.set(member.id, updatedMember);
    return updatedMember;
  }
  
  async removeProjectMember(projectId: number, userId: number): Promise<void> {
    const member = await this.getProjectMember(projectId, userId);
    if (!member) {
      throw new Error("Project member not found");
    }
    
    // Don't allow removing the owner
    if (member.role === UserRole.OWNER) {
      throw new Error("Cannot remove the project owner");
    }
    
    this.projectMembers.delete(member.id);
  }
  
  async isUserProjectMember(projectId: number, userId: number): Promise<boolean> {
    const member = await this.getProjectMember(projectId, userId);
    return member !== null;
  }
  
  async getUserRole(projectId: number, userId: number): Promise<string | null> {
    const member = await this.getProjectMember(projectId, userId);
    return member ? member.role : null;
  }
  
  async getSharedProjects(userId: number): Promise<Project[]> {
    const memberRecords = Array.from(this.projectMembers.values())
      .filter(member => member.userId === userId && member.role !== UserRole.OWNER);
      
    // Now get the actual projects
    const projects: Project[] = [];
    for (const member of memberRecords) {
      const project = this.projects.get(member.projectId);
      if (project) {
        projects.push(project);
      }
    }
    
    return projects;
  }

  // User methods
  async getUser(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const allUsers = Array.from(this.users.values());
    for (const user of allUsers) {
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
  
  async getTodo(id: number): Promise<Todo> {
    const todo = this.todos.get(id);
    if (!todo) throw new Error("Todo not found");
    return todo;
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
  
  async getExpense(id: number): Promise<Expense> {
    const expense = this.expenses.get(id);
    if (!expense) throw new Error("Expense not found");
    return expense;
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
  
  async getCategory(id: number): Promise<CustomCategory> {
    const category = this.categories.get(id);
    if (!category) throw new Error("Category not found");
    return category;
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
    const entries = Array.from(this.todos.entries());
    for (const [key, value] of entries) {
      if (value.projectId === projectId && value.category === oldCategory) {
        this.updateTodo(key, {category: newCategory});
      }
    }
  }

  async updateTodosWithCategory(projectId: number, oldCategory: string, newCategory: string): Promise<void> {
    const entries = Array.from(this.todos.entries());
    for (const [id, todo] of entries) {
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

  // Note methods
  async getNotes(projectId: number): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter(note => note.projectId === projectId);
  }

  async getNoteById(id: number): Promise<Note> {
    const note = this.notes.get(id);
    if (!note) throw new Error("Note not found");
    return note;
  }

  async getNotesByTag(projectId: number, tag: string): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter(note => note.projectId === projectId && note.tags?.includes(tag));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const id = this.noteId++;
    const now = new Date();
    const newNote = {
      ...note,
      id,
      createdAt: now,
      updatedAt: now,
      tags: note.tags || [],
      markdownContent: note.markdownContent || null,
      attachments: note.attachments || null
    };
    this.notes.set(id, newNote);
    return newNote;
  }

  async updateNote(id: number, update: Partial<Note>): Promise<Note> {
    const note = this.notes.get(id);
    if (!note) throw new Error("Note not found");

    const updatedNote = {
      ...note,
      ...update,
      updatedAt: new Date()
    };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }

  async deleteNote(id: number): Promise<void> {
    this.notes.delete(id);
  }

  async searchNotes(projectId: number, query: string): Promise<Note[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.notes.values())
      .filter(note => 
        note.projectId === projectId && 
        (note.title.toLowerCase().includes(lowercaseQuery) || 
         note.content.toLowerCase().includes(lowercaseQuery) ||
         note.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
      );
  }
}

export const storage = new MemStorage();