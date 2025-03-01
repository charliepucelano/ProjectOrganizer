import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExpenseForm from "@/components/expense-form";
import type { Expense } from "@shared/schema";
import { format } from "date-fns";

export default function Budget() {
  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"]
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const actualExpenses = expenses?.filter(e => !e.isBudget) || [];
  const budgetExpenses = expenses?.filter(e => e.isBudget) || [];

  const actualTotal = actualExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const budgetTotal = budgetExpenses.reduce((sum, exp) => sum + exp.amount, 0);

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
              <div>Actual Expenses: ${actualTotal.toFixed(2)}</div>
              <div>Estimated Future Expenses: ${budgetTotal.toFixed(2)}</div>
              <div className="pt-2 border-t">
                <div className="text-lg font-semibold">
                  Total Budget: ${(actualTotal + budgetTotal).toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimated Future Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgetExpenses.map((expense) => (
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
                <div className="font-semibold">${expense.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actual Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {actualExpenses.map((expense) => (
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
                <div className="font-semibold">${expense.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}