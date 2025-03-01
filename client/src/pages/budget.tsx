import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExpenseForm from "@/components/expense-form";
import type { Expense } from "@shared/schema";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Budget() {
  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"]
  });
  const { toast } = useToast();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const markAsPaidMutation = useMutation({
    mutationFn: async (expense: Expense) => {
      await apiRequest("PATCH", `/api/expenses/${expense.id}`, {
        ...expense,
        isBudget: 0,
        completedAt: new Date().toISOString()
      });

      // If this expense is associated with a todo, mark it as completed
      if (expense.todoId) {
        await apiRequest("PATCH", `/api/todos/${expense.todoId}`, {
          completed: 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Success",
        description: "Expense marked as paid"
      });
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const estimatedExpenses = expenses?.filter(e => e.isBudget) || [];
  const paidExpenses = expenses?.filter(e => !e.isBudget) || [];

  const estimatedTotal = estimatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const paidTotal = paidExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (editingExpense) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm 
            expense={editingExpense} 
            onCancel={() => setEditingExpense(null)} 
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Budget Tracking</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>Estimated Budget: €{estimatedTotal.toFixed(2)}</div>
              <div>Paid Expenses: €{paidTotal.toFixed(2)}</div>
              <div className="pt-2 border-t">
                <div className="text-lg font-semibold">
                  Total Budget: €{(estimatedTotal + paidTotal).toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimated Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {estimatedExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex justify-between items-center p-4 border rounded-lg bg-muted/50"
              >
                <div>
                  <div className="font-medium">{expense.description}</div>
                  <div className="text-sm text-muted-foreground">
                    Due: {format(new Date(expense.date), "PPP")} - {expense.category}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">€{expense.amount.toFixed(2)}</div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">Mark as Paid</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark Expense as Paid?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the expense as paid. If this expense is associated with a task, the task will also be marked as completed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => markAsPaidMutation.mutate(expense)}>
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingExpense(expense)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
            {estimatedExpenses.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No estimated expenses yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paid Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paidExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex justify-between items-center p-4 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{expense.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(expense.date), "PPP")} - {expense.category}
                  </div>
                  {expense.completedAt && (
                    <div className="text-sm text-green-600">
                      Paid on {format(new Date(expense.completedAt), "PPP")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">€{expense.amount.toFixed(2)}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingExpense(expense)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
            {paidExpenses.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No paid expenses yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}