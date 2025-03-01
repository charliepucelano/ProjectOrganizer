import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Todo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Trash2, DollarSign, Pencil, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, startOfToday, isBefore, isAfter } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TodoForm from "./todo-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TodoListProps {
  todos: Todo[];
}

type FilterOption = "all" | "completed" | "incomplete" | "category";

export default function TodoList({ todos }: TodoListProps) {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showPriority, setShowPriority] = useState(true);
  const { toast } = useToast();

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"]
  });

  // Calculate task statistics and organize todos
  const organizedTodos = useMemo(() => {
    let filteredTodos = [...todos];
    const today = startOfToday();
    const nextWeek = addDays(today, 7);

    // Apply filters
    if (filterBy === "completed") {
      filteredTodos = filteredTodos.filter(t => t.completed);
    } else if (filterBy === "incomplete") {
      filteredTodos = filteredTodos.filter(t => !t.completed);
    }

    if (selectedCategory !== "all") {
      filteredTodos = filteredTodos.filter(t => t.category === selectedCategory);
    }

    // Calculate statistics
    const totalOpen = filteredTodos.filter(t => !t.completed).length;
    const totalCompleted = filteredTodos.filter(t => t.completed).length;
    const dueSoon = filteredTodos.filter(t => 
      t.dueDate && 
      !t.completed &&
      isAfter(new Date(t.dueDate), today) && 
      isBefore(new Date(t.dueDate), nextWeek)
    ).length;

    // Organize todos by priority and date
    const highPriority = filteredTodos.filter(t => t.priority && !t.completed);
    const nextSevenDays = filteredTodos.filter(t => 
      !t.completed &&
      !t.priority &&
      t.dueDate &&
      isAfter(new Date(t.dueDate), today) && 
      isBefore(new Date(t.dueDate), nextWeek)
    );
    const otherOpen = filteredTodos.filter(t => 
      !t.completed && 
      !t.priority && 
      (!t.dueDate || isAfter(new Date(t.dueDate), nextWeek))
    );
    const completed = filteredTodos.filter(t => t.completed);

    // Sort each group by due date
    const sortByDueDate = (a: Todo, b: Todo) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    };

    return {
      stats: {
        open: totalOpen,
        completed: totalCompleted,
        dueSoon
      },
      todos: {
        highPriority: highPriority.sort(sortByDueDate),
        nextSevenDays: nextSevenDays.sort(sortByDueDate),
        otherOpen: otherOpen.sort(sortByDueDate),
        completed: completed.sort(sortByDueDate)
      }
    };
  }, [todos, filterBy, selectedCategory]);

  const toggleMutation = useMutation({
    mutationFn: async (todo: Todo) => {
      const completed = todo.completed ? 0 : 1;
      await apiRequest(
        "PATCH",
        `/api/todos/${todo.id}`,
        { completed }
      );

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

  const allCategories = [
    "all",
    ...(categories?.map(c => c.name) || [])
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Open Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizedTodos.stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizedTodos.stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Due in 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizedTodos.stats.dueSoon}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
            </SelectContent>
          </Select>

          {filterBy === "category" && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={() => setShowPriority(!showPriority)}
        >
          {showPriority ? "Hide" : "Show"} Priority Tasks
        </Button>
      </div>

      {showPriority && organizedTodos.todos.highPriority.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">High Priority Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizedTodos.todos.highPriority.map(renderTodo)}
            </div>
          </CardContent>
        </Card>
      )}

      {organizedTodos.todos.nextSevenDays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Due in Next 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizedTodos.todos.nextSevenDays.map(renderTodo)}
            </div>
          </CardContent>
        </Card>
      )}

      {organizedTodos.todos.otherOpen.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other Open Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizedTodos.todos.otherOpen.map(renderTodo)}
            </div>
          </CardContent>
        </Card>
      )}

      {organizedTodos.todos.completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizedTodos.todos.completed.map(renderTodo)}
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