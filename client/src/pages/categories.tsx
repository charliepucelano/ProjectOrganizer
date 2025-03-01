import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { insertCustomCategorySchema, defaultTodoCategories } from "@shared/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditCategoryDialog from "@/components/edit-category-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Categories() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const { toast } = useToast();

  const { data: customCategories = [] } = useQuery({
    queryKey: ["/api/categories"]
  });

  const form = useForm({
    resolver: zodResolver(insertCustomCategorySchema),
    defaultValues: {
      name: "",
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      await apiRequest("POST", "/api/categories", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      form.reset();
      toast({
        title: "Success",
        description: "Category created successfully"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDeleteDialogOpen(false);
      toast({
        title: "Success",
        description: "Category deleted successfully. All associated items have been moved to 'Unassigned'."
      });
    }
  });

  const onSubmit = (values: any) => {
    createMutation.mutate(values);
  };

  const handleEditClick = (category: any) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (category: any) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCategory) {
      deleteMutation.mutate(selectedCategory.id);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Categories</h1>

      <div className="space-y-6">
        {/* Add new category form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="New category name" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Category"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Default categories */}
        <Card>
          <CardHeader>
            <CardTitle>Default Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {defaultTodoCategories.map((category) => (
                <Badge key={category} variant="secondary">{category}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom categories with edit/delete */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {customCategories.length === 0 ? (
              <p className="text-muted-foreground text-sm">No custom categories yet.</p>
            ) : (
              <div className="space-y-2">
                {customCategories.map((category: any) => (
                  <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span>{category.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedCategory && (
        <>
          <EditCategoryDialog 
            category={selectedCategory} 
            open={editDialogOpen} 
            onOpenChange={setEditDialogOpen}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete the category "{selectedCategory.name}". All items in this category will be moved to "Unassigned".
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
