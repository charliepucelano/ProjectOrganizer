
import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { insertTodoSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [newlyAddedCategory, setNewlyAddedCategory] = useState<string | null>(null);

  // Use categories from API or empty array if not loaded yet
  const todoCategories = categories || [];

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

  // Effect to select newly added category when it becomes available
  useEffect(() => {
    if (newlyAddedCategory && categories?.includes(newlyAddedCategory)) {
      form.setValue("category", newlyAddedCategory);
      setNewlyAddedCategory(null);
    }
  }, [categories, newlyAddedCategory, form]);

  // Declare all hooks at the top level before any conditional returns
  const mutation = useMutation({
    mutationFn: async (values: any) => {
      setIsSubmitting(true);
      try {
        const method = todo ? "PATCH" : "POST";
        const endpoint = todo ? `/api/todos/${todo.id}` : "/api/todos";
        
        const todoData = await apiRequest(method, endpoint, values);
        
        // If has associated expense, create that too
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

  // Create new category mutation
  const categoryMutation = useMutation({
    mutationFn: async () => {
      if (!categoryName.trim()) {
        throw new Error("Category name is required");
      }
      
      // Check for duplicates
      if (categories?.includes(categoryName.trim())) {
        throw new Error("Category already exists");
      }
      
      return apiRequest("POST", "/api/categories", { name: categoryName.trim() });
    },
    onSuccess: async (response) => {
      try {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        
        // Save the new category name to select it when it becomes available in the list
        setNewlyAddedCategory(data.name);
        
        setIsAddingCategory(false);
        setCategoryName("");
        toast({
          title: "Success",
          description: "Category added successfully"
        });
      } catch (error) {
        console.error("Error processing category response:", error);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add category",
        variant: "destructive"
      });
    }
  });

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
                <Textarea {...field} value={field.value || ""} />
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
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || "Unassigned"} 
                  defaultValue="Unassigned"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                      <DialogDescription>
                        Enter a name for the new category
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Input
                          id="categoryName"
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          className="col-span-4"
                          placeholder="Category name"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        onClick={() => categoryMutation.mutate()}
                      >
                        Add Category
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-md border">
              <FormControl>
                <Checkbox
                  checked={field.value === 1}
                  onCheckedChange={(checked) => {
                    field.onChange(checked ? 1 : 0);
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  High Priority
                </FormLabel>
                <FormDescription>
                  Mark as high priority task
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value), "PPP")
                      ) : (
                        <span>No due date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date?.toISOString() || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hasAssociatedExpense"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-md border">
              <FormControl>
                <Checkbox
                  checked={field.value === 1}
                  onCheckedChange={(checked) => {
                    field.onChange(checked ? 1 : 0);
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Create Budget Item
                </FormLabel>
                <FormDescription>
                  Creates a budget expense for this task
                </FormDescription>
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
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || null)}
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
