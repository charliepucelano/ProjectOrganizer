import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { insertCustomCategorySchema } from "@shared/schema";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CategoryDialogProps {
  projectId?: number;
}

export default function CategoryDialog({ projectId }: CategoryDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertCustomCategorySchema),
    defaultValues: {
      name: "",
      projectId: projectId || null
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      if (projectId) {
        // Project-specific category
        await apiRequest("POST", `/api/projects/${projectId}/categories`, { name: values.name });
      } else {
        // Global category
        await apiRequest("POST", "/api/categories", { name: values.name });
      }
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'categories'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'todos'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      }
      form.reset();
      setOpen(false);
      toast({
        title: t('categories.categoryCreated'),
        description: t('categories.categoryCreatedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('errors.unexpectedError'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (values: any) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Enter category name" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}