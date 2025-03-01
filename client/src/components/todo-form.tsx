import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { insertTodoSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface TodoFormProps {
  todo?: any;
  onCancel?: () => void;
}

export default function TodoForm({ todo, onCancel }: TodoFormProps) {
  const { toast } = useToast();
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    refetchOnWindowFocus: true
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  const todoCategories = [
    "Unassigned",
    ...(categories?.map(c => c.name) || [])
  ];

  const form = useForm({
    resolver: zodResolver(insertTodoSchema),
    defaultValues: todo || {
      title: "",
      description: "",
      category: "Unassigned", // Set Unassigned as default
      priority: 0,
      completed: 0,
      dueDate: null,
      hasAssociatedExpense: 0,
      estimatedAmount: null
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      try {
        setIsSubmitting(true);
        console.log('Submitting todo with values:', values);

        const endpoint = todo ? `/api/todos/${todo.id}` : "/api/todos";
        const method = todo ? "PATCH" : "POST";

        const todoResponse = await apiRequest(method, endpoint, {
          ...values,
          description: values.description || null,
          dueDate: values.dueDate || null,
          estimatedAmount: values.estimatedAmount ? Number(values.estimatedAmount) : null,
          hasAssociatedExpense: values.hasAssociatedExpense ? 1 : 0,
          priority: values.priority ? 1 : 0,
        });

        const todoData = await todoResponse.json();
        console.log('Todo created:', todoData);

        if (values.hasAssociatedExpense && values.estimatedAmount > 0) {
          console.log('Creating associated expense');
          await apiRequest("POST", "/api/expenses", {
            description: values.title,
            amount: values.estimatedAmount,
            category: values.category,
            date: values.dueDate || new Date().toISOString(),
            todoId: todoData.id,
            isBudget: 1,
            completedAt: null
          });
        }
        return todoData;
      } catch (error) {
        console.error('Error submitting form:', error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      if (!todo) form.reset();
      if (onCancel) onCancel();
      toast({
        title: "Success",
        description: todo ? "Task updated successfully" : "Task created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save task",
        variant: "destructive"
      });
    }
  });

  const categoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/categories", { name });
      return response;
    },
    onSuccess: async (response) => {
      try {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        // Auto-select the newly created category
        form.setValue("category", data.name);
        setIsAddingCategory(false);
        setCategoryName("");
        toast({
          title: "Success",
          description: "Category created successfully"
        });
      } catch (error) {
        console.error("Error processing category response:", error);
        toast({
          title: "Error",
          description: "Failed to create category",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive"
      });
    }
  });

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (categoryName.trim()) {
      categoryMutation.mutate(categoryName.trim());
    }
  };

  const onSubmit = async (data: any) => {
    if (isSubmitting) return;
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
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
                <Textarea {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <div className="flex gap-2">
                <Select onValueChange={field.onChange} value={field.value || "Unassigned"} defaultValue="Unassigned">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem key="Unassigned" value="Unassigned">
                      Unassigned
                    </SelectItem>
                    {(categories || []).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAddingCategory(true);
                      }}
                    >
                      +
                    </Button>
                  </DialogTrigger>
                  <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                      <DialogTitle>Create New Category</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit} className="space-y-4 pt-4">
                      <Input
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Category name"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setCategoryName("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          Create
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value ? field.value.split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    field.onChange(date ? new Date(date).toISOString() : null);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
              <FormMessage />
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
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("hasAssociatedExpense") === 1 && (
          <FormField
            control={form.control}
            name="estimatedAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Amount (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : (todo ? "Update" : "Add")} Task
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