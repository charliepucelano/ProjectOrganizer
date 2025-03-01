import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Todo } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, DollarSign, Pencil } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TodoForm from "./todo-form";

interface TodoListProps {
  todos: Todo[];
}

export default function TodoList({ todos }: TodoListProps) {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const toggleMutation = useMutation({
    mutationFn: async (todo: Todo) => {
      const completed = todo.completed ? 0 : 1;
      await apiRequest(
        "PATCH",
        `/api/todos/${todo.id}`,
        { completed }
      );

      // If the todo has an associated expense and is being completed
      if (todo.hasAssociatedExpense && completed === 1) {
        const response = await apiRequest("GET", `/api/expenses`);
        const expenses = await response.json();
        const expense = expenses.find((e: any) => e.todoId === todo.id && e.isBudget);

        if (expense) {
          await apiRequest(
            "PATCH",
            `/api/expenses/${expense.id}`,
            {
              isBudget: 0,
              completedAt: new Date().toISOString()
            }
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
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
    }
  });

  if (editingTodo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Todo</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {todos.map(todo => (
            <div
              key={todo.id}
              className={`flex items-center space-x-4 p-4 border rounded-lg ${
                todo.completed ? 'bg-muted/50' : ''
              }`}
            >
              <Checkbox
                checked={!!todo.completed}
                onCheckedChange={() => toggleMutation.mutate(todo)}
              />
              <div className="flex-1">
                <div className="font-medium">{todo.title}</div>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(todo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {todos.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No tasks yet. Add your first task above.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}