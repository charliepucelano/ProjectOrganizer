import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { insertExpenseSchema, defaultExpenseCategories } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CategoryDialog from "./category-dialog";

export default function ExpenseForm({ expense, onCancel }: { expense?: any; onCancel?: () => void }) {
  const { toast } = useToast();
  const { data: customCategories } = useQuery({
    queryKey: ["/api/categories"]
  });

  const expenseCategories = [
    ...defaultExpenseCategories,
    ...(customCategories?.map(c => c.name) || [])
  ];

  const form = useForm({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: expense || {
      description: "",
      amount: 0,
      category: "Other",
      date: new Date().toISOString()
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const endpoint = expense ? `/api/expenses/${expense.id}` : "/api/expenses";
      const method = expense ? "PATCH" : "POST";
      await apiRequest(method, endpoint, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      if (!expense) form.reset();
      if (onCancel) onCancel();
      toast({
        title: "Success",
        description: expense ? "Expense updated successfully" : "Expense added successfully"
      });
    }
  });

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    value={field.value}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {expense ? "Update" : "Add"} Expense
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Form>
      <div className="mt-4">
        <CategoryDialog />
      </div>
    </>
  );
}