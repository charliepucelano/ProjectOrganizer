import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Todo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Trash2, DollarSign, Pencil, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format, isWithinInterval, startOfWeek, endOfWeek, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TodoForm from "./todo-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TodoListProps {
  todos: Todo[];
}

type SortOption = "dueDate" | "priority" | "category";
type FilterOption = "all" | "completed" | "incomplete" | "withExpense" | "withoutExpense";

export default function TodoList({ todos }: TodoListProps) {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("dueDate");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const { toast } = useToast();

  // Group and sort todos
  const organizedTodos = useMemo(() => {
    // First apply filters
    let filteredTodos = [...todos];
    switch (filterBy) {
      case "completed":
        filteredTodos = filteredTodos.filter(t => t.completed);
        break;
      case "incomplete":
        filteredTodos = filteredTodos.filter(t => !t.completed);
        break;
      case "withExpense":
        filteredTodos = filteredTodos.filter(t => t.hasAssociatedExpense);
        break;
      case "withoutExpense":
        filteredTodos = filteredTodos.filter(t => !t.hasAssociatedExpense);
        break;
    }

    // Then sort
    filteredTodos.sort((a, b) => {
      switch (sortBy) {
        case "dueDate":
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "priority":
          return b.priority - a.priority;
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    // Group by due date status
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    return {
      thisWeek: filteredTodos.filter(todo => 
        todo.dueDate && 
        isWithinInterval(new Date(todo.dueDate), { start: weekStart, end: weekEnd })
      ),
      otherDates: filteredTodos.filter(todo => 
        todo.dueDate && 
        !isWithinInterval(new Date(todo.dueDate), { start: weekStart, end: weekEnd })
      ),
      noDueDate: filteredTodos.filter(todo => !todo.dueDate)
    };
  }, [todos, sortBy, filterBy]);

  const toggleMutation = useMutation({
    mutationFn: async (todo: Todo) => {
      const completed = todo.completed ? 0 : 1;
      await apiRequest(
        "PATCH",
        `/api/todos/${todo.id}`,
        { completed }
      );

      // If the todo has an associated expense
      if (todo.hasAssociatedExpense) {
        const response = await apiRequest("GET", `/api/expenses`);
        const expenses = await response.json();
        const expense = expenses.find((e: any) => e.todoId === todo.id);

        if (expense) {
          await apiRequest(
            "PATCH",
            `/api/expenses/${expense.id}`,
            {
              isBudget: completed ? 0 : 1,
              completedAt: completed ? new Date().toISOString() : null
            }
          );
        }
      }
    },
    onSuccess: (_, todo) => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: `Task ${todo.completed ? "reopened" : "completed"} successfully`
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/todos/${id}`);

      // Delete associated expense if exists
      const response = await apiRequest("GET", `/api/expenses`);
      const expenses = await response.json();
      const expense = expenses.find((e: any) => e.todoId === id);
      if (expense) {
        await apiRequest("DELETE", `/api/expenses/${expense.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Task deleted successfully"
      });
    }
  });

  if (editingTodo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TodoForm 
            todo={editingTodo} 
            onCancel={() => setEditingTodo(null)} 
          />
        </CardContent>
      </Card>
    );
  }

  const renderTodo = (todo: Todo) => (
    <div
      key={todo.id}
      className={`flex items-center space-x-4 p-4 border rounded-lg ${
        todo.completed ? 'bg-muted/50' : ''
      }`}
    >
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost"
            size="sm"
            className={todo.completed ? 'text-green-600' : 'text-muted-foreground'}
          >
            {todo.completed ? (
              <XCircle className="h-6 w-6" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {todo.completed ? "Reopen Task?" : "Complete Task?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {todo.completed 
                ? "This will reopen the task. If this task has an associated expense, it will be marked as unpaid."
                : "This will mark the task as completed. If this task has an associated expense, it will be marked as paid."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleMutation.mutate(todo)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex-1">
        <div className={`font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
          {todo.title}
        </div>
        {todo.description && (
          <div className="text-sm text-muted-foreground">
            {todo.description}
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          Category: {todo.category}
        </div>
        {todo.dueDate && (
          <div className="text-sm text-muted-foreground">
            Due: {format(new Date(todo.dueDate), "PPP")}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {todo.hasAssociatedExpense === 1 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {todo.estimatedAmount?.toFixed(2)}
          </Badge>
        )}
        <Badge variant={todo.priority ? "destructive" : "secondary"}>
          {todo.priority ? "High" : "Normal"}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditingTodo(todo)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the task. If this task has an associated expense, it will also be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate(todo.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Sort by Due Date</SelectItem>
              <SelectItem value="priority">Sort by Priority</SelectItem>
              <SelectItem value="category">Sort by Category</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
              <SelectItem value="withExpense">With Expense</SelectItem>
              <SelectItem value="withoutExpense">Without Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {organizedTodos.noDueDate.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const element = document.getElementById('no-due-date');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            {organizedTodos.noDueDate.length} tasks need dates
          </Button>
        )}
      </div>

      {organizedTodos.thisWeek.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>This Week's Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizedTodos.thisWeek.map(renderTodo)}
            </div>
          </CardContent>
        </Card>
      )}

      {organizedTodos.otherDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other Scheduled Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizedTodos.otherDates.map(renderTodo)}
            </div>
          </CardContent>
        </Card>
      )}

      {organizedTodos.noDueDate.length > 0 && (
        <Card id="no-due-date">
          <CardHeader>
            <CardTitle>Tasks Without Due Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizedTodos.noDueDate.map(renderTodo)}
            </div>
          </CardContent>
        </Card>
      )}

      {todos.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No tasks yet. Add your first task above.
        </div>
      )}
    </div>
  );
}