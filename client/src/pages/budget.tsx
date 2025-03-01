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

  const total = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

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
              <div>Total Expenses: ${total.toFixed(2)}</div>
              <div>Number of Expenses: {expenses?.length || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses?.map((expense) => (
              <div
                key={expense.id}
                className="flex justify-between items-center p-4 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{expense.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(expense.date), "PPP")} - {expense.category}
                  </div>
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
