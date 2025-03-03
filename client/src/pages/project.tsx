import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { ArrowLeft, Home, CalendarDays, DollarSign, ListTodo, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Project } from "@shared/schema";
import { ProtectedRoute } from "@/lib/protected-route";
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
  
  const totalBudget = expenses
    .filter(expense => expense.isBudget)
    .reduce((sum, expense) => sum + expense.amount, 0);
    
  const totalSpent = expenses
    .filter(expense => !expense.isBudget)
    .reduce((sum, expense) => sum + expense.amount, 0);
    
  const completedTodos = todos.filter(todo => todo.completed).length;
  const totalTodos = todos.length;
  
  return (
    <ProtectedRoute>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Home className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="todos">
              <ListTodo className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="expenses">
              <DollarSign className="h-4 w-4 mr-2" />
              Budget & Expenses
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendar
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
                  ) : expenses.filter(e => !e.isBudget).length > 0 ? (
                    <div className="space-y-2">
                      {expenses.filter(e => !e.isBudget).slice(0, 5).map(expense => (
                        <div key={expense.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{expense.description}</div>
                            <div className="text-xs text-muted-foreground">{expense.category}</div>
                          </div>
                          <div className="font-medium">${expense.amount.toFixed(2)}</div>
                        </div>
                      ))}
                      {expenses.filter(e => !e.isBudget).length > 5 && (
                        <Button variant="ghost" className="w-full mt-2" onClick={() => setActiveTab("expenses")}>
                          See all {expenses.filter(e => !e.isBudget).length} expenses
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
              <Button onClick={() => setShowAddExpense(!showAddExpense)}>
                {showAddExpense ? "Cancel" : "Add Expense/Budget"}
              </Button>
            </div>
            
            {showAddExpense && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Add New Expense or Budget Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <ExpenseForm 
                    projectId={projectId}
                    onCancel={() => setShowAddExpense(false)}
                    onSuccess={() => {
                      setShowAddExpense(false);
                      queryClient.invalidateQueries({ 
                        queryKey: [`/api/projects/${projectId}/expenses`] 
                      });
                    }}
                  />
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalBudget.toFixed(2)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(totalBudget - totalSpent).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Budget Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : expenses.filter(e => e.isBudget).length > 0 ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="p-2 text-left">Category</th>
                            <th className="p-2 text-left">Description</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses
                            .filter(e => e.isBudget)
                            .map(expense => (
                              <tr key={expense.id} className="border-t">
                                <td className="p-2">{expense.category}</td>
                                <td className="p-2">{expense.description}</td>
                                <td className="p-2 text-right">${expense.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t">
                          <tr className="font-bold">
                            <td className="p-2" colSpan={2}>Total</td>
                            <td className="p-2 text-right">${totalBudget.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">No budget items yet</p>
                    {!showAddExpense && (
                      <Button onClick={() => setShowAddExpense(true)}>
                        Add budget item
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : expenses.filter(e => !e.isBudget).length > 0 ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">Category</th>
                            <th className="p-2 text-left">Description</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses
                            .filter(e => !e.isBudget)
                            .map(expense => (
                              <tr key={expense.id} className="border-t">
                                <td className="p-2">{new Date(expense.date).toLocaleDateString()}</td>
                                <td className="p-2">{expense.category}</td>
                                <td className="p-2">{expense.description}</td>
                                <td className="p-2 text-right">${expense.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t">
                          <tr className="font-bold">
                            <td className="p-2" colSpan={3}>Total</td>
                            <td className="p-2 text-right">${totalSpent.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">No expenses yet</p>
                    {!showAddExpense && (
                      <Button onClick={() => setShowAddExpense(true)}>
                        Add expense
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="calendar" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Project Calendar</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>View and manage your project schedule</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <h3 className="text-xl font-medium mb-2">Calendar View</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Calendar integration allows you to visualize your project timeline and tasks with due dates.
                  </p>
                  
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-sm font-medium p-2">{day}</div>
                    ))}
                    
                    {Array.from({ length: 35 }).map((_, i) => {
                      const day = i + 1;
                      const hasTask = todos.some(todo => 
                        todo.dueDate && 
                        new Date(todo.dueDate).getDate() === day && 
                        new Date(todo.dueDate).getMonth() === new Date().getMonth()
                      );
                      
                      return (
                        <div 
                          key={i} 
                          className={`p-2 rounded border text-center relative ${
                            hasTask ? 'bg-primary/10 border-primary/20' : ''
                          }`}
                        >
                          {day <= 31 && (
                            <>
                              <span>{day}</span>
                              {hasTask && (
                                <div className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-primary" />
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <h4 className="font-medium mb-4">Tasks with Due Dates</h4>
                  
                  {todos.filter(todo => todo.dueDate).length > 0 ? (
                    <div className="space-y-2 max-w-lg mx-auto">
                      {todos
                        .filter(todo => todo.dueDate)
                        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                        .map(todo => (
                          <div key={todo.id} className="flex items-center justify-between p-2 border rounded">
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
    </ProtectedRoute>
  );
}