
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { insertCustomCategorySchema } from "@shared/schema";
import type { CustomCategory } from "@shared/schema";

interface EditCategoryDialogProps {
  category: CustomCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditCategoryDialog({ category, open, onOpenChange }: EditCategoryDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertCustomCategorySchema),
    defaultValues: {
      name: category.name,
      projectId: category.projectId
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      await apiRequest("PATCH", `/api/categories/${category.id}`, values);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      if (category.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', category.projectId, 'categories'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', category.projectId, 'todos'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', category.projectId, 'expenses'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      }
      
      onOpenChange(false);
      form.reset();
      
      toast({
        title: t('categories.categoryUpdated'),
        description: t('categories.categoryUpdatedDesc')
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
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? t('common.saving') : t('common.saveChanges')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
