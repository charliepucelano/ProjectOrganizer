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
import { Switch } from "@/components/ui/switch";

interface ExpenseFormProps {
  expense?: any;
  onCancel?: () => void;
  projectId?: number;
  onSuccess?: () => void;
}

export default function ExpenseForm({ expense, onCancel, projectId, onSuccess }: ExpenseFormProps) {
  const { toast } = useToast();
  
  // Get categories - either global or project-specific
  const { data: customCategories = [] } = useQuery({
    queryKey: projectId ? [`/api/projects/${projectId}/categories`] : ["/api/categories"],
    enabled: !!projectId
  });

  // Combine default categories with custom categories
  const allExpenseCategories = [
    ...defaultExpenseCategories,
    ...(customCategories?.map ? customCategories.map((c: any) => c.name) : [])
  ];
  
  // Remove duplicates by converting to Set and back to array
  const expenseCategories = [...new Set(allExpenseCategories)];

  const form = useForm({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: expense || {
      description: "",
      amount: 0,
      category: "Other",
      date: new Date().toISOString(),
      isBudget: 0,
      todoId: null,
      completedAt: null,
      projectId: projectId || null
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const endpoint = expense ? `/api/expenses/${expense.id}` : "/api/expenses";
      const method = expense ? "PATCH" : "POST";
      await apiRequest(method, endpoint, {
        ...values,
        projectId: projectId || null
      });
    },
    onSuccess: () => {
      // Invalidate the appropriate queries
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/expenses`] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      }
      
      if (!expense) form.reset();
      if (onCancel) onCancel();
      if (onSuccess) onSuccess();
      
      toast({
        title: "Success",
        description: expense ? "Expense updated successfully" : "Expense added successfully"
      });
    }
  });

  return (
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
              <FormLabel>Amount ($)</FormLabel>
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

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
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
        
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value ? field.value.split('T')[0] : new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const date = e.target.value;
                    field.onChange(date ? new Date(date).toISOString() : new Date().toISOString());
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isBudget"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Budget Item (not an actual expense)</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value === 1}
                    onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                  />
                </FormControl>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {expense ? "Update" : "Add"} {form.watch("isBudget") ? "Budget Item" : "Expense"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}