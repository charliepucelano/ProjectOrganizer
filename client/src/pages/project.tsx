import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, useRoute, Link } from "wouter";
import { ArrowLeft, Home, CalendarDays, DollarSign, ListTodo, Settings, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Project } from "@shared/schema";
import { useTranslation } from "react-i18next";
import ProjectSettings from "@/components/project-settings";

import TodoList from "@/components/todo-list";
import TodoForm from "@/components/todo-form";
import ExpenseForm from "@/components/expense-form";
import CategoryDialog from "@/components/category-dialog";

export default function ProjectPage() {
  const [, params] = useRoute("/project/:id");
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  const projectId = params?.id ? parseInt(params.id) : null;
  
  // Query to get project details
  const { 
    data: project, 
    isLoading: projectLoading,
    error: projectError
  } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId && !!user
  });
  
  // Query to get todos for this project
  const {
    data: todos = [],
    isLoading: todosLoading,
    error: todosError
  } = useQuery({
    queryKey: [`/api/projects/${projectId}/todos`],
    enabled: !!projectId && !!user
  });
  
  // Query to get expenses for this project
  const {
    data: expenses = [],
    isLoading: expensesLoading,
    error: expensesError
  } = useQuery({
    queryKey: [`/api/projects/${projectId}/expenses`],
    enabled: !!projectId && !!user
  });
  
  // State for editing an expense
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Dialog state for expense payment confirmation
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [expenseToToggle, setExpenseToToggle] = useState(null);
  
  // Mutation to toggle expense payment status
  const toggleExpenseStatusMutation = useMutation({
    mutationFn: async (expense) => {
      try {
        // Toggle the isBudget status (0 = paid, 1 = unpaid)
        const newStatus = expense.isBudget === 1 ? 0 : 1;
        const timestamp = new Date().toISOString();
        
        // First update the expense
        await apiRequest(
          "PATCH",
          `/api/expenses/${expense.id}`,
          { 
            isBudget: newStatus,
            completedAt: newStatus === 0 ? timestamp : null 
          }
        );
        
        // If expense has associated task, update the task status accordingly
        if (expense.todoId) {
          try {
            // Update the task status (mark as completed if expense is paid)
            await apiRequest(
              "PATCH",
              `/api/todos/${expense.todoId}`,
              { 
                completed: newStatus === 0 ? 1 : 0,
                completedAt: newStatus === 0 ? timestamp : null 
              }
            );
            
            // Invalidate todos queries to refresh the UI
            queryClient.invalidateQueries({ 
              queryKey: [`/api/projects/${projectId}/todos`] 
            });
            queryClient.invalidateQueries({ 
              queryKey: [`/api/todos`] 
            });
          } catch (todoError) {
            console.error("Error updating associated task:", todoError);
            toast({
              title: "Warning",
              description: "Expense updated but task status could not be updated",
              variant: "destructive"
            });
          }
        }
        
        return true;
      } catch (error) {
        console.error("Error toggling expense status:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all relevant queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/expenses`] });
      
      toast({
        title: "Success",
        description: "Expense status updated"
      });
      
      // Reset dialog state
      setShowPaymentDialog(false);
      setExpenseToToggle(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update expense status",
        variant: "destructive"
      });
      
      // Reset dialog state
      setShowPaymentDialog(false);
      setExpenseToToggle(null);
    }
  });
  
  // Mutation to delete an expense
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId) => {
      await apiRequest("DELETE", `/api/expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/expenses`] });
      toast({
        title: "Success",
        description: "Expense deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      });
    }
  });
  
  // Function to toggle expense payment status
  const toggleExpenseStatus = (expense) => {
    // If we're marking as paid, show confirmation dialog
    if (expense.isBudget === 1) {
      setExpenseToToggle({...expense}); // Create a copy to avoid reference issues
      setShowPaymentDialog(true);
    } else {
      // If we're marking as unpaid, just do it directly
      toggleExpenseStatusMutation.mutate({...expense}); // Create a copy to avoid reference issues
    }
  };
  
  // Function to edit an expense
  const editExpense = (expense) => {
    setEditingExpense(expense);
    setShowAddExpense(true);
  };
  
  // Function to delete an expense
  const deleteExpense = (expenseId) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(expenseId);
    }
  };
  
  // Query to get categories for this project
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError
  } = useQuery({
    queryKey: [`/api/projects/${projectId}/categories`],
    enabled: !!projectId && !!user
  });
  
  // Handle error states
  useEffect(() => {
    if (projectError) {
      toast({
        title: "Error",
        description: "Failed to load project. Please try again.",
        variant: "destructive"
      });
      navigate("/projects");
    }
  }, [projectError, navigate, toast]);
  
  if (!projectId) {
    return <div>Invalid project ID</div>;
  }
  
  if (projectLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }
  
  // Calculate budget need (unpaid expenses, isBudget=1)
  const totalBudget = expenses
    .filter(expense => expense.isBudget === 1)
    .reduce((sum, expense) => sum + expense.amount, 0);
    
  // Calculate total spent (paid expenses, isBudget=0)
  const totalSpent = expenses
    .filter(expense => expense.isBudget === 0)
    .reduce((sum, expense) => sum + expense.amount, 0);
    
  const completedTodos = todos.filter(todo => todo.completed).length;
  const totalTodos = todos.length;
  
  return (
    <>
      <div className="container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{project?.name}</h1>
              {project?.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
          <div>
            <Button variant="outline" onClick={() => navigate(`/project/${projectId}/settings`)}>
              <Settings className="h-4 w-4 mr-2" />
              Project Settings
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <Home className="h-4 w-4 mr-2" />
              {t('common.overview')}
            </TabsTrigger>
            <TabsTrigger value="todos">
              <ListTodo className="h-4 w-4 mr-2" />
              {t('common.tasks')}
            </TabsTrigger>
            <TabsTrigger value="expenses">
              <DollarSign className="h-4 w-4 mr-2" />
              {t('common.budget')}
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays className="h-4 w-4 mr-2" />
              {t('common.calendar')}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              {t('common.settings')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {completedTodos}/{totalTodos}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totalTodos === 0 
                      ? "No tasks yet" 
                      : `${Math.round((completedTodos / totalTodos) * 100)}% complete`}
                  </p>
                  <Button 
                    variant="ghost" 
                    className="mt-4 w-full"
                    onClick={() => setActiveTab("todos")}
                  >
                    View all tasks
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalBudget.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Planned budget for this project
                  </p>
                  <Button 
                    variant="ghost" 
                    className="mt-4 w-full"
                    onClick={() => setActiveTab("expenses")}
                  >
                    Manage budget
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalSpent.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totalBudget > 0 
                      ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget` 
                      : "No budget set"}
                  </p>
                  <Button 
                    variant="ghost" 
                    className="mt-4 w-full"
                    onClick={() => setActiveTab("expenses")}
                  >
                    View expenses
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Tasks</CardTitle>
                  <CardDescription>
                    Your latest project tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {todosLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : todos.length > 0 ? (
                    <div className="space-y-2">
                      {todos.slice(0, 5).map(todo => (
                        <div key={todo.id} className="flex items-center p-2 border rounded">
                          <div className={`mr-2 h-3 w-3 rounded-full ${todo.completed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <div>
                            <div className="font-medium">{todo.title}</div>
                            <div className="text-xs text-muted-foreground">{todo.category}</div>
                          </div>
                        </div>
                      ))}
                      {todos.length > 5 && (
                        <Button variant="ghost" className="w-full mt-2" onClick={() => setActiveTab("todos")}>
                          See all {todos.length} tasks
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No tasks yet</p>
                      <Button 
                        className="mt-2" 
                        onClick={() => {
                          setActiveTab("todos");
                          setShowAddTodo(true);
                        }}
                      >
                        Add first task
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>
                    Your latest project expenses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {expensesLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : expenses.filter(e => e.isBudget === 0).length > 0 ? (
                    <div className="space-y-2">
                      {expenses.filter(e => e.isBudget === 0).slice(0, 5).map(expense => (
                        <div key={expense.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{expense.description}</div>
                            <div className="text-xs text-muted-foreground">{expense.category}</div>
                          </div>
                          <div className="font-medium">${expense.amount.toFixed(2)}</div>
                        </div>
                      ))}
                      {expenses.filter(e => e.isBudget === 0).length > 5 && (
                        <Button variant="ghost" className="w-full mt-2" onClick={() => setActiveTab("expenses")}>
                          See all {expenses.filter(e => e.isBudget === 0).length} expenses
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No expenses yet</p>
                      <Button 
                        className="mt-2" 
                        onClick={() => {
                          setActiveTab("expenses");
                          setShowAddExpense(true);
                        }}
                      >
                        Add first expense
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="todos" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Tasks</h2>
              <div className="flex gap-2">
                <CategoryDialog projectId={projectId} />
                <Button onClick={() => setShowAddTodo(!showAddTodo)}>
                  {showAddTodo ? "Cancel" : "Add Task"}
                </Button>
              </div>
            </div>
            
            {showAddTodo && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Add New Task</CardTitle>
                </CardHeader>
                <CardContent>
                  <TodoForm 
                    projectId={projectId}
                    onCancel={() => setShowAddTodo(false)}
                    onSuccess={() => {
                      setShowAddTodo(false);
                      queryClient.invalidateQueries({ 
                        queryKey: [`/api/projects/${projectId}/todos`] 
                      });
                    }}
                  />
                </CardContent>
              </Card>
            )}
            
            {todosLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : todos.length > 0 ? (
              <TodoList todos={todos} projectId={projectId} />
            ) : (
              <div className="text-center py-12 border rounded-lg">
                <h3 className="text-xl font-medium mb-2">No tasks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first task
                </p>
                {!showAddTodo && (
                  <Button onClick={() => setShowAddTodo(true)}>
                    Add your first task
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Budget & Expenses</h2>
              <Button onClick={() => {
                setEditingExpense(null);
                setShowAddExpense(!showAddExpense);
              }}>
                {showAddExpense ? "Cancel" : "Add Expense/Budget"}
              </Button>
            </div>
            
            {showAddExpense && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{editingExpense ? "Edit" : "Add New"} Expense or Budget Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <ExpenseForm 
                    expense={editingExpense}
                    projectId={projectId}
                    onCancel={() => {
                      setShowAddExpense(false);
                      setEditingExpense(null);
                    }}
                    onSuccess={() => {
                      setShowAddExpense(false);
                      setEditingExpense(null);
                      queryClient.invalidateQueries({ 
                        queryKey: [`/api/projects/${projectId}/expenses`] 
                      });
                    }}
                  />
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalBudget.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Planned budget for this project
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalBudget > 0 
                      ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget` 
                      : "No budget set"}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>All Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : expenses.length > 0 ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">Category</th>
                            <th className="p-2 text-left">Description</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-right">Amount</th>
                            <th className="p-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map(expense => (
                            <tr key={expense.id} className="border-t">
                              <td className="p-2">{new Date(expense.date).toLocaleDateString()}</td>
                              <td className="p-2">{expense.category}</td>
                              <td className="p-2">{expense.description}</td>
                              <td className="p-2 text-center">
                                <Badge 
                                  variant={expense.isBudget === 1 ? "outline" : "default"}
                                  className="cursor-pointer"
                                  onClick={() => toggleExpenseStatus(expense)}
                                >
                                  {expense.isBudget === 1 ? "Unpaid" : "Paid"}
                                </Badge>
                              </td>
                              <td className="p-2 text-right">${expense.amount.toFixed(2)}</td>
                              <td className="p-2 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => editExpense(expense)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteExpense(expense.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg">
                    <h3 className="text-xl font-medium mb-2">No expenses yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Get started by adding your first expense
                    </p>
                    {!showAddExpense && (
                      <Button onClick={() => setShowAddExpense(true)}>
                        Add your first expense
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Calendar</CardTitle>
                <CardDescription>
                  View tasks with due dates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                      <div key={day} className="text-sm font-medium p-2">{day}</div>
                    ))}
                  </div>
                  
                  {todosLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : todos.filter(todo => todo.dueDate).length > 0 ? (
                    <div className="space-y-2">
                      {todos
                        .filter(todo => todo.dueDate)
                        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                        .map(todo => (
                          <div key={todo.id} className="flex justify-between items-center p-2 border rounded">
                            <div className="flex items-center">
                              <div className={`mr-2 h-3 w-3 rounded-full ${todo.completed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                              <div>
                                <div className="font-medium">{todo.title}</div>
                                <div className="text-xs text-muted-foreground">{todo.category}</div>
                              </div>
                            </div>
                            <div className="text-sm">
                              {todo.dueDate && new Date(todo.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      No tasks with due dates. Add due dates to your tasks to see them in the calendar.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Payment Confirmation Dialog */}
      <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Expense as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              {expenseToToggle?.todoId ? 
                "This expense is linked to a task. Marking it as paid will also complete the associated task."
               : 
                "Are you sure you want to mark this expense as paid?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-2 p-3 border rounded">
            <div className="flex justify-between font-medium">
              <span>{expenseToToggle?.description}</span>
              <span>${expenseToToggle?.amount?.toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{expenseToToggle?.category}</div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleExpenseStatusMutation.mutate(expenseToToggle)}>
              Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}