import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Todo, defaultTodoCategories } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TodoListProps {
  todos: Todo[];
}

export default function TodoList({ todos }: TodoListProps) {
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
        const { data: expenses } = await apiRequest("GET", `/api/expenses`);
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
      const { data: expenses } = await apiRequest("GET", `/api/expenses`);
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

  const todosByCategory = defaultTodoCategories.reduce((acc: Record<string, Todo[]>, category: string) => {
    acc[category] = todos.filter(todo => todo.category === category);
    return acc;
  }, {} as Record<string, Todo[]>);

  return (
    <div className="space-y-6">
      {defaultTodoCategories.map(category => {
        const categoryTodos = todosByCategory[category];
        if (!categoryTodos?.length) return null;

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryTodos.map(todo => (
                  <div
                    key={todo.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg"
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
                        onClick={() => deleteMutation.mutate(todo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}