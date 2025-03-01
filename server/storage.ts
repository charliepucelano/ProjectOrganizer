import { Todo, InsertTodo, Expense, InsertExpense } from "@shared/schema";

export interface IStorage {
  // Todos
  getTodos(): Promise<Todo[]>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, todo: Partial<Todo>): Promise<Todo>;
  deleteTodo(id: number): Promise<void>;
  
  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private todos: Map<number, Todo>;
  private expenses: Map<number, Expense>;
  private todoId: number;
  private expenseId: number;

  constructor() {
    this.todos = new Map();
    this.expenses = new Map();
    this.todoId = 1;
    this.expenseId = 1;
  }

  async getTodos(): Promise<Todo[]> {
    return Array.from(this.todos.values());
  }

  async createTodo(todo: InsertTodo): Promise<Todo> {
    const id = this.todoId++;
    const newTodo = { ...todo, id };
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
    const newExpense = { ...expense, id };
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async deleteExpense(id: number): Promise<void> {
    this.expenses.delete(id);
  }
}

export const storage = new MemStorage();
