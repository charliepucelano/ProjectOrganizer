import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/lib/protected-route";
import { useIsMobile } from "@/hooks/use-mobile";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { Edit, Trash, Plus, Search, Tag as TagIcon, Filter } from "lucide-react";

type Note = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  projectId: number;
  createdAt: string;
  updatedAt: string;
};

function NoteCard({ note, onDelete, onEdit }: { note: Note; onDelete: (id: number) => void; onEdit: (note: Note) => void }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const maxContentLength = isMobile ? 100 : 150;

  return (
    <Card className="p-4 mb-4 relative">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold mb-2">{note.title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
              <span className="sr-only">{t("menu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(note)}>
              <Edit className="w-4 h-4 mr-2" />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(note.id)} className="text-red-600">
              <Trash className="w-4 h-4 mr-2" />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-sm text-gray-500 mb-2">
        {new Date(note.updatedAt).toLocaleString()}
      </p>
      <p className="mb-3">
        {note.content.length > maxContentLength
          ? `${note.content.substring(0, maxContentLength)}...`
          : note.content}
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {note.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

function NoteForm({ note, onClose, projectId }: { note?: Note; onClose: () => void; projectId: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(note?.tags || []);

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; tags: string[]; projectId: number }) => {
      const response = await apiRequest(
        "/api/notes",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes`] });
      toast({
        title: t("noteCreated"),
        description: t("noteCreatedDescription"),
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; content: string; tags: string[] }) => {
      const response = await apiRequest(
        `/api/notes/${data.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes`] });
      toast({
        title: t("noteUpdated"),
        description: t("noteUpdatedDescription"),
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: t("validationError"),
        description: t("titleAndContentRequired"),
        variant: "destructive",
      });
      return;
    }

    if (note?.id) {
      updateMutation.mutate({
        id: note.id,
        title,
        content,
        tags,
      });
    } else {
      createMutation.mutate({
        title,
        content,
        tags,
        projectId,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("title")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("enterTitle")}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="content">{t("content")}</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("enterContent")}
          className="min-h-[200px]"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tags">{t("tags")}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder={t("enterTag")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <Button type="button" onClick={handleAddTag} size="sm">
            {t("add")}
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
              {tag} ×
            </Badge>
          ))}
        </div>
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {note ? t("updateNote") : t("createNote")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function NotesPage() {
  const { t } = useTranslation();
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/notes`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: project = {} } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/notes/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes`] });
      toast({
        title: t("noteDeleted"),
        description: t("noteDeletedDescription"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm(t("confirmDeleteNote"))) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setIsFormOpen(true);
  };

  const handleAddNote = () => {
    setSelectedNote(undefined);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedNote(undefined);
  };

  // Extract all unique tags from notes
  const allTags = Array.from(
    new Set(notes.flatMap((note: Note) => note.tags))
  ).sort();

  // Filter notes based on search, active tab, and selected tag
  const filteredNotes = notes.filter((note: Note) => {
    const matchesSearch = search
      ? note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.content.toLowerCase().includes(search.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      : true;
    
    const matchesTag = selectedTag
      ? note.tags.includes(selectedTag)
      : true;
    
    return matchesSearch && matchesTag;
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">{t("loading")}...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("notes")} - {project.name}</h1>
        <Button onClick={handleAddNote}>
          <Plus className="w-4 h-4 mr-2" />
          {t("newNote")}
        </Button>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder={t("searchNotes")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {allTags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <TagIcon className="w-4 h-4 mr-2" />
                {selectedTag || t("filterByTag")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedTag(null)}>
                {t("allTags")}
              </DropdownMenuItem>
              {allTags.map((tag) => (
                <DropdownMenuItem key={tag} onClick={() => setSelectedTag(tag)}>
                  {tag}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">{t("noNotesFound")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note: Note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedNote ? t("editNote") : t("createNote")}</DialogTitle>
            <DialogDescription>
              {selectedNote ? t("editNoteDescription") : t("createNoteDescription")}
            </DialogDescription>
          </DialogHeader>
          
          <NoteForm
            note={selectedNote}
            onClose={closeForm}
            projectId={projectId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NotesProtected() {
  return (
    <ProtectedRoute>
      <NotesPage />
    </ProtectedRoute>
  );
}