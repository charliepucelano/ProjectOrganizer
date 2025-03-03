import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface TodoFormProps {
  todo?: any; 
  onCancel?: () => void;
  projectId?: number;
  onSuccess?: () => void;
}

export default function TodoForm({ todo, onCancel, projectId, onSuccess }: TodoFormProps) {
  const { toast } = useToast();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get categories - either global or project-specific
  const { data: customCategories = [] } = useQuery({
    queryKey: projectId ? [`/api/projects/${projectId}/categories`] : ["/api/categories"],
    enabled: !!projectId
  });

  // Combine default categories with custom categories, making sure there are no duplicates
  const allCategories = projectId && customCategories.length > 0
    ? [...defaultTodoCategories, ...customCategories.map((cat: any) => cat.name)]
    : defaultTodoCategories;
    
  // Remove duplicates by converting to Set and back to array
  const categories = [...new Set(allCategories)];

  const form = useForm({
    resolver: zodResolver(insertTodoSchema),
    defaultValues: todo || {
      title: "",
      description: "",
      category: "Unassigned",
      completed: 0,
      dueDate: null,
      priority: 0,
      hasAssociatedExpense: 0,
      estimatedAmount: null,
      projectId: projectId || null
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      try {
        setIsSubmitting(true);
        const endpoint = todo ? `/api/todos/${todo.id}` : "/api/todos";
        const method = todo ? "PATCH" : "POST";

        const todoResponse = await apiRequest(method, endpoint, {
          ...values,
          description: values.description || null,
          dueDate: values.dueDate || null,
          estimatedAmount: values.estimatedAmount ? Number(values.estimatedAmount) : null,
          hasAssociatedExpense: values.hasAssociatedExpense ? 1 : 0,
          priority: values.priority ? 1 : 0,
          category: values.category || "Unassigned",
          projectId: projectId || null
        });

        const todoData = await todoResponse.json();

        if (values.hasAssociatedExpense && values.estimatedAmount > 0) {
          await apiRequest("POST", "/api/expenses", {
            description: values.title,
            amount: values.estimatedAmount,
            category: values.category || "Unassigned",
            date: values.dueDate || new Date().toISOString(),
            todoId: todoData.id,
            isBudget: 1,
            completedAt: null,
            projectId: projectId || null
          });
        }
        return todoData;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      // Invalidate the appropriate queries
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/todos`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/expenses`] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
        queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      }
      
      if (!todo) form.reset();
      if (onCancel) onCancel();
      if (onSuccess) onSuccess();
      
      toast({
        title: "Success",
        description: todo ? "Task updated successfully" : "Task created successfully"
      });
    }
  });

  const categoryMutation = useMutation({
    mutationFn: async (name: string) => {
      let response;
      if (projectId) {
        // Create project-specific category
        response = await apiRequest("POST", `/api/projects/${projectId}/categories`, { name });
      } else {
        // Create global category
        response = await apiRequest("POST", "/api/categories", { name });
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/categories`] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      }
      
      // Auto-select the newly created category
      form.setValue("category", data.name);
      setIsAddingCategory(false);
      setCategoryName("");
      toast({
        title: "Success",
        description: "Category created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!categoryName.trim()) return;
    categoryMutation.mutate(categoryName.trim());
  };

  return (
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
                <Textarea {...field} value={field.value || ''} />
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
              <div className="flex gap-2">
                <Select
                  onValueChange={field.onChange}
                  value={field.value || "Unassigned"}
                  defaultValue="Unassigned"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
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
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <FormItem>
                        <FormLabel>Category Name</FormLabel>
                        <FormControl>
                          <Input
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="Enter category name"
                          />
                        </FormControl>
                      </FormItem>
                      <Button type="submit" disabled={categoryMutation.isPending}>
                        {categoryMutation.isPending ? "Creating..." : "Create Category"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
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
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hasAssociatedExpense"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Create Budget Item</FormLabel>
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

        {form.watch("hasAssociatedExpense") === 1 && (
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
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormControl>
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