import { useQuery } from "@tanstack/react-query";
import TodoList from "@/components/todo-list";
import TodoForm from "@/components/todo-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Todo } from "@shared/schema";

export default function Home() {
  const { data: todos, isLoading } = useQuery<Todo[]>({
    queryKey: ["/api/todos"]
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TodoForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>Total Tasks: {todos?.length || 0}</div>
              <div>
                Completed: {todos?.filter((t) => t.completed).length || 0}
              </div>
              <div>
                Due in 7 days: {
                  todos?.filter((t) => 
                    t.dueDate && 
                    !t.completed &&
                    new Date(t.dueDate) > new Date() &&
                    new Date(t.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  ).length || 0
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TodoList todos={todos || []} />
    </div>
  );
}