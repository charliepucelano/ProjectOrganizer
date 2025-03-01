import { useQuery } from "@tanstack/react-query";
import TodoList from "@/components/todo-list";
import TodoForm from "@/components/todo-form";
import GenerateTodos from "@/components/generate-todos";
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Move-in Tasks</h1>
        <GenerateTodos />
      </div>

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
                Completed:{" "}
                {todos?.filter((t) => t.completed).length || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TodoList todos={todos || []} />
    </div>
  );
}
