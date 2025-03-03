import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Tag, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { CustomCategory, Project } from '../../../shared/schema';
import CategoryDialog from './category-dialog';
import EditCategoryDialog from './edit-category-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { defaultCategories } from '../../../shared/schema';

interface ProjectSettingsProps {
  projectId: number;
  project: Project;
}

export default function ProjectSettings({ projectId, project }: ProjectSettingsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('categories');
  const [editCategory, setEditCategory] = useState<CustomCategory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CustomCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reassignCategory, setReassignCategory] = useState<string>('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch custom categories for this project
  const { data: customCategories = [] } = useQuery({
    queryKey: ['/api/projects', projectId, 'categories'],
    enabled: !!projectId,
  });

  // Mutation to delete a category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      await apiRequest('DELETE', `/api/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'todos'] });
      toast({
        title: t('categories.categoryDeleted'),
        description: t('categories.categoryDeleted'),
      });
      setCategoryToDelete(null);
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('errors.unexpectedError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle category deletion with reassignment
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      // First update all items with the old category to the new category
      await apiRequest(
        'PATCH',
        `/api/categories/${categoryToDelete.id}/reassign`,
        { newCategory: reassignCategory }
      );
      
      // Then delete the category
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
    } catch (error) {
      toast({
        title: t('errors.unexpectedError'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleCategoryEdit = (category: CustomCategory) => {
    setEditCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (category: CustomCategory) => {
    if (category.name === 'Unassigned') {
      toast({
        title: t('categories.cannotDeleteUnassigned'),
        description: t('categories.cannotDeleteUnassigned'),
        variant: 'destructive',
      });
      return;
    }
    
    setCategoryToDelete(category);
    setReassignCategory('Unassigned'); // Default to Unassigned
    setDeleteDialogOpen(true);
  };

  // Get all available categories (default + custom)
  const allCategories = [
    ...defaultCategories,
    ...(customCategories?.map?.((cat: CustomCategory) => cat.name) || [])
  ].filter((cat, index, self) => self.indexOf(cat) === index); // Remove duplicates

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Settings className="mr-2 h-5 w-5" />
        <h2 className="text-2xl font-bold">{t('settings.projectSettings')}</h2>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-1">
          <TabsTrigger value="categories">
            <Tag className="mr-2 h-4 w-4" />
            {t('common.categories')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('categories.manageCategories')}</CardTitle>
              <CardDescription>
                {t('categories.manageProjectCategories')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <CategoryDialog projectId={projectId} />
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('categories.allCategories')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {/* Show the Unassigned category first (read-only) */}
                      <div className="flex items-center justify-between p-2 rounded-md border">
                        <span>Unassigned</span>
                        <Badge variant="secondary">{t('categories.default')}</Badge>
                      </div>
                      
                      {/* Show the default categories not including Unassigned */}
                      {Array.isArray(defaultCategories) && defaultCategories
                        .filter(category => category !== "Unassigned")
                        .map((category) => (
                          <div key={category} className="flex items-center justify-between p-2 rounded-md border">
                            <span>{category}</span>
                            <Badge variant="outline">{t('categories.standard')}</Badge>
                          </div>
                      ))}
                      
                      {/* Then show any custom categories the user has added */}
                      {Array.isArray(customCategories) && customCategories.length > 0 && 
                        customCategories.map((category: CustomCategory) => (
                          <div key={category.id} className="flex items-center justify-between p-2 rounded-md border">
                            <span>{category.name}</span>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCategoryEdit(category)}
                              >
                                {t('common.edit')}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeleteClick(category)}
                              >
                                {t('common.delete')}
                              </Button>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Edit Category Dialog */}
      {editCategory && (
        <EditCategoryDialog 
          category={editCategory} 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen} 
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categories.assignedItemsWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">{t('categories.reassignTo')}</h4>
              <select 
                className="w-full p-2 border rounded-md"
                value={reassignCategory}
                onChange={(e) => setReassignCategory(e.target.value)}
              >
                {allCategories
                  .filter(cat => cat !== (categoryToDelete?.name || ''))
                  .map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}