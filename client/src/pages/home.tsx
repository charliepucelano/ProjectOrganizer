import { useQuery, useMutation } from "@tanstack/react-query";
import TodoList from "@/components/todo-list";
import TodoForm from "@/components/todo-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, RefreshCw } from "lucide-react";
import type { Todo } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { data: todos, isLoading } = useQuery<Todo[]>({
    queryKey: ["/api/todos"]
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync-calendar");
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Calendar Synced",
        description: `Successfully synced ${result.successful} tasks to Google Calendar${
          result.failed > 0 ? `. Failed to sync ${result.failed} tasks.` : ""
        }`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update the useEffect hook to handle detailed error messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error) {
      if (error === 'google_auth_cancelled') {
        toast({
          title: "Calendar Connection Cancelled",
          description: "You cancelled the Google Calendar connection.",
          variant: "default"
        });
      } else if (error === 'google_auth_failed') {
        toast({
          title: "Calendar Connection Failed",
          description: "Failed to connect to Google Calendar. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Calendar Connection Error",
          description: decodeURIComponent(error),
          variant: "destructive"
        });
      }

      // Clean up the URL
      window.history.replaceState({}, '', location);
    }
  }, [location, toast]);

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
            <div className="space-y-4">
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

              {/* Google Calendar Integration */}
              <div className="pt-2 border-t space-y-2">
                <Button
                  variant={user?.googleAccessToken ? "secondary" : "default"}
                  className="w-full"
                  onClick={() => window.location.href = "/api/auth/google"}
                  disabled={!!user?.googleAccessToken}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {user?.googleAccessToken 
                    ? "Google Calendar Connected" 
                    : "Connect Google Calendar"}
                </Button>

                {user?.googleAccessToken && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${
                        syncMutation.isPending ? "animate-spin" : ""
                      }`} />
                      {syncMutation.isPending 
                        ? "Syncing Tasks..." 
                        : "Sync All Tasks to Calendar"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Tasks with due dates will be added to your Google Calendar automatically
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TodoList todos={todos || []} />
    </div>
  );
}