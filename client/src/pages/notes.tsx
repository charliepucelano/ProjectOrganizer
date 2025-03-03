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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Trash, Edit, Plus, Check, X, Loader2, Filter } from "lucide-react";
import { TagIcon, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { markdownToHtml, getSmartSuggestions, expandNote as expandNoteWithAI } from "@/lib/perplexity";

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
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const maxContentLength = isMobile ? 100 : 150;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [expandedContent, setExpandedContent] = useState("");
  const [expandLoading, setExpandLoading] = useState(false);

  // Get smart suggestions based on note content
  const handleGetSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const results = await getSmartSuggestions(note.content);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error getting suggestions:", error);
      toast({
        title: t("error") || "Error",
        description: t("suggestionError") || "Failed to get suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Research note with AI-generated content
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [refinementLoading, setRefinementLoading] = useState(false);
  const [researchAction, setResearchAction] = useState<"save" | "refine" | "discard" | null>(null);
  
  const handleResearchNote = async () => {
    setExpandLoading(true);
    try {
      const expanded = await expandNoteWithAI(note.content, note.title, note.tags);
      setExpandedContent(expanded);
      setResearchModalOpen(true);
    } catch (error) {
      console.error("Error researching note:", error);
      toast({
        title: t("error") || "Error",
        description: t("expandError") || "Failed to research note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExpandLoading(false);
    }
  };
  
  const handleRefinement = async () => {
    if (!refinementPrompt.trim()) {
      toast({
        title: t("validationError") || "Validation Error",
        description: t("refinementPromptRequired") || "Please enter refinement instructions.",
        variant: "destructive",
      });
      return;
    }
    
    setRefinementLoading(true);
    try {
      // Create a combined prompt with original content and refinement request
      const combinedPrompt = `
Original Research: 
${expandedContent}

Refinement Instructions: 
${refinementPrompt}

Please refine the original research based on these instructions.
`;
      const refined = await expandNoteWithAI(combinedPrompt, note.title, note.tags);
      setExpandedContent(refined);
      setRefinementPrompt("");
      toast({
        title: t("refinementComplete") || "Refinement Complete",
        description: t("refinementCompleteDescription") || "Your research has been refined.",
      });
    } catch (error) {
      console.error("Error refining research:", error);
      toast({
        title: t("error") || "Error",
        description: t("refinementError") || "Failed to refine research. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefinementLoading(false);
    }
  };
  
  const handleSaveResearch = async () => {
    // Implementation for saving would be handled by parent component
    setResearchModalOpen(false);
    setIsExpanded(true);
    setResearchAction("save");
  };

  const truncatedContent = note.content.length > maxContentLength
    ? `${note.content.substring(0, maxContentLength)}...`
    : note.content;

  // Create a safe HTML string from markdown content
  const createMarkdownHtml = (content: string) => {
    const htmlContent = markdownToHtml(content);
    return { __html: htmlContent };
  };

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
              <span className="sr-only">{t("menu") || "Menu"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(note)}>
              <Edit className="w-4 h-4 mr-2" />
              {t("edit") || "Edit"}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleResearchNote} disabled={expandLoading}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-4 h-4 mr-2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              {expandLoading 
                ? (t("loading") || "Loading...") 
                : (t("researchNote") || "Research Note")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(note.id)} className="text-red-600">
              <Trash className="w-4 h-4 mr-2" />
              {t("delete") || "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <p className="text-sm text-gray-500 mb-2">
        {new Date(note.updatedAt).toLocaleString()}
      </p>
      
      {/* Normal content view with markdown support */}
      {!isExpanded && (
        <>
          {showFullContent ? (
            <div 
              className="prose prose-sm max-w-none mb-3" 
              dangerouslySetInnerHTML={createMarkdownHtml(note.content)} 
            />
          ) : (
            <div className="mb-3">
              <p>{truncatedContent}</p>
              {note.content.length > maxContentLength && (
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-xs"
                  onClick={() => setShowFullContent(true)}
                >
                  {t("readMore") || "Read more"}
                </Button>
              )}
            </div>
          )}
        </>
      )}
      
      {/* Expanded content view */}
      {isExpanded && (
        <div className="mb-3">
          <div 
            className="prose prose-sm max-w-none mb-3 p-3 bg-secondary/30 rounded-md prose-a:text-primary prose-a:underline" 
            dangerouslySetInnerHTML={createMarkdownHtml(expandedContent)} 
          />
        </div>
      )}
      
      {/* Research note modal */}
      <Dialog open={researchModalOpen} onOpenChange={setResearchModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("researchResults") || "Research Results"}</DialogTitle>
            <DialogDescription>
              {t("researchResultsDescription") || "AI-powered research based on your note content."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="prose prose-sm max-w-none mb-4 p-4 border rounded-md bg-card prose-a:text-primary prose-a:underline">
              <div dangerouslySetInnerHTML={createMarkdownHtml(expandedContent)} />
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">{t("whatNext") || "What would you like to do?"}</h4>
              
              <div className="flex flex-col space-y-2">
                <Button
                  variant="default"
                  onClick={handleSaveResearch}
                  className="justify-start"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {t("saveResearch") || "Save this research"}
                </Button>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="refine">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center">
                        <Edit className="mr-2 h-4 w-4" />
                        {t("refineResearch") || "Refine this research"}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <Textarea
                          value={refinementPrompt}
                          onChange={(e) => setRefinementPrompt(e.target.value)}
                          placeholder={t("refinementInstructions") || "Enter specific instructions for refinement..."}
                          className="min-h-[100px]"
                        />
                        <Button 
                          onClick={handleRefinement}
                          disabled={refinementLoading}
                        >
                          {refinementLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("refining") || "Refining..."}
                            </>
                          ) : (
                            <>{t("refine") || "Refine"}</>
                          )}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <Button
                  variant="outline"
                  onClick={() => setResearchModalOpen(false)}
                  className="justify-start"
                >
                  <X className="mr-2 h-4 w-4" />
                  {t("discardResearch") || "Discard this research"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Smart suggestions section */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-4 mt-2 p-3 bg-primary/10 rounded-md">
          <h4 className="text-sm font-semibold mb-2">{t("smartSuggestions") || "Smart Suggestions"}</h4>
          <ul className="pl-5 text-sm list-disc space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 text-xs"
            onClick={() => setShowSuggestions(false)}
          >
            {t("hideSuggestions") || "Hide Suggestions"}
          </Button>
        </div>
      )}
      
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
  const [previewMode, setPreviewMode] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; tags: string[]; projectId: number }) => {
      console.log("Creating note with data:", data);
      try {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data),
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create note");
        }
        
        return response.json();
      } catch (err) {
        console.error("Error creating note:", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes`] });
      toast({
        title: t("noteCreated") || "Note Created",
        description: t("noteCreatedDescription") || "Your note has been created successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error("Create mutation error:", error);
      toast({
        title: t("error") || "Error",
        description: error.message || "Failed to create note",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; content: string; tags: string[] }) => {
      console.log("Updating note with data:", data);
      try {
        const response = await fetch(`/api/notes/${data.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data),
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update note");
        }
        
        return response.json();
      } catch (err) {
        console.error("Error updating note:", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes`] });
      toast({
        title: t("noteUpdated") || "Note Updated",
        description: t("noteUpdatedDescription") || "Your note has been updated successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error("Update mutation error:", error);
      toast({
        title: t("error") || "Error",
        description: error.message || "Failed to update note",
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
        title: t("validationError") || "Validation Error",
        description: t("titleAndContentRequired") || "Title and content are required.",
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

  // Insert markdown formatting helpers
  const insertMarkdown = (markdownSyntax: string, placeholder: string = "") => {
    const textarea = document.getElementById("content") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newContent = 
      content.substring(0, start) + 
      markdownSyntax.replace("$1", textToInsert) + 
      content.substring(end);
    
    setContent(newContent);
    
    // Focus back on textarea after insertion
    setTimeout(() => {
      textarea.focus();
      
      // Set cursor position
      const newPosition = start + markdownSyntax.indexOf("$1") + (selectedText || placeholder).length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Create a safe HTML string from markdown content for preview
  const createMarkdownHtml = (markdownContent: string) => {
    const htmlContent = markdownToHtml(markdownContent);
    return { __html: htmlContent };
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("title") || "Title"}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("enterTitle") || "Enter a title"}
          required
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="content">{t("content") || "Content"}</Label>
          <div className="flex items-center justify-end space-x-1">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              className="h-8 px-2"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? (t("edit") || "Edit") : (t("preview") || "Preview")}
            </Button>
          </div>
        </div>
        
        {/* Markdown toolbar */}
        {!previewMode && (
          <div className="flex flex-wrap gap-1 mb-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => insertMarkdown("**$1**", "bold text")}
              title={t("bold") || "Bold"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
              </svg>
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => insertMarkdown("*$1*", "italic text")}
              title={t("italic") || "Italic"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="4" x2="10" y2="4"/>
                <line x1="14" y1="20" x2="5" y2="20"/>
                <line x1="15" y1="4" x2="9" y2="20"/>
              </svg>
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => insertMarkdown("# $1", "Heading")}
              title={t("heading") || "Heading"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 12h12"/>
                <path d="M6 4h12"/>
                <path d="M9 4v16"/>
              </svg>
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => insertMarkdown("- $1", "List item")}
              title={t("list") || "List"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => insertMarkdown("1. $1", "Numbered item")}
              title={t("numberedList") || "Numbered List"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="10" y1="6" x2="21" y2="6"/>
                <line x1="10" y1="12" x2="21" y2="12"/>
                <line x1="10" y1="18" x2="21" y2="18"/>
                <path d="M4 6h1v4"/>
                <path d="M4 16a1 1 0 0 0 1 1h.5a1 1 0 0 0 0-2H5V14a1 1 0 0 0 2 0"/>
              </svg>
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => insertMarkdown("[title](https://example.com)", "Link")}
              title={t("link") || "Link"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => insertMarkdown("```\n$1\n```", "code block")}
              title={t("codeBlock") || "Code Block"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </Button>
          </div>
        )}
        
        {/* Content input or preview */}
        {previewMode ? (
          <div className="border rounded-md p-4 min-h-[200px] prose prose-sm max-w-none">
            {content ? (
              <div dangerouslySetInnerHTML={createMarkdownHtml(content)} />
            ) : (
              <p className="text-muted-foreground">
                {t("previewEmpty") || "Nothing to preview yet..."}
              </p>
            )}
          </div>
        ) : (
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("enterContent") || "Enter content (Markdown supported)"}
            className="min-h-[200px] font-mono text-sm"
            required
          />
        )}
        
        {/* Markdown help */}
        {!previewMode && (
          <p className="text-xs text-muted-foreground mt-1">
            {t("markdownSupported") || "Markdown formatting is supported. Use toolbar or manually format text."}
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tags">{t("tags") || "Tags"}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder={t("enterTag") || "Enter a tag"}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <Button type="button" onClick={handleAddTag} size="sm">
            {t("add") || "Add"}
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
          {t("cancel") || "Cancel"}
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {note ? (t("updateNote") || "Update Note") : (t("createNote") || "Create Note")}
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

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: [`/api/projects/${projectId}/notes`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: project = { name: "" } } = useQuery<{ id: number; name: string }>({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("Deleting note with ID:", id);
      try {
        const response = await fetch(`/api/notes/${id}`, {
          method: "DELETE",
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to delete note");
        }
        
        return true;
      } catch (err) {
        console.error("Error deleting note:", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes`] });
      toast({
        title: t("noteDeleted") || "Note Deleted",
        description: t("noteDeletedDescription") || "Your note has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Delete mutation error:", error);
      toast({
        title: t("error") || "Error",
        description: error.message || "Failed to delete note",
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
    new Set(notes?.flatMap((note: Note) => note.tags) || [])
  ).sort();

  // Filter notes based on search, active tab, and selected tag
  const filteredNotes = (notes || []).filter((note: Note) => {
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
  return <NotesPage />;
}