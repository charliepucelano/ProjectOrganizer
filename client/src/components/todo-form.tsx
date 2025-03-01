import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { insertTodoSchema, defaultTodoCategories } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CategoryDialog from "./category-dialog";

export default function TodoForm({ todo, onCancel }: { todo?: any; onCancel?: () => void }) {
  const { toast } = useToast();
  const { data: customCategories } = useQuery({
    queryKey: ["/api/categories"]
  });

  const todoCategories = [
    ...defaultTodoCategories,
    ...(customCategories?.map(c => c.name) || [])
  ];

  const form = useForm({
    resolver: zodResolver(insertTodoSchema),
    defaultValues: todo || {
      title: "",
      description: "",
      category: "Pre-Move",
      priority: 0,
      completed: 0,
      dueDate: null,
      hasAssociatedExpense: 0,
      estimatedAmount: 0
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const endpoint = todo ? `/api/todos/${todo.id}` : "/api/todos";
      const method = todo ? "PATCH" : "POST";

      const todoResponse = await apiRequest(method, endpoint, values);
      const todoData = await todoResponse.json();

      if (values.hasAssociatedExpense) {
        await apiRequest("POST", "/api/expenses", {
          description: values.title,
          amount: values.estimatedAmount,
          category: values.category,
          date: values.dueDate,
          todoId: todoData.id,
          isBudget: 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      if (!todo) form.reset();
      if (onCancel) onCancel();
      toast({
        title: "Success",
        description: todo ? "Todo updated successfully" : "Todo created successfully"
      });
    }
  });

  const hasExpense = form.watch("hasAssociatedExpense");

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} />
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
                      {todoCategories.map((category) => (
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

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString())}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasAssociatedExpense"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Has Associated Expense</FormLabel>
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

          {hasExpense === 1 && (
            <FormField
              control={form.control}
              name="estimatedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Amount</FormLabel>
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
          )}

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>High Priority</FormLabel>
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
              {todo ? "Update" : "Add"} Todo
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