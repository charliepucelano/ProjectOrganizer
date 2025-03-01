import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { generateTodos } from "@/lib/perplexity";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function GenerateTodos() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      try {
        const suggestions = await generateTodos();
        for (const todo of suggestions) {
          await apiRequest("POST", "/api/todos", {
            ...todo,
            priority: 0,
            completed: 0
          });
        }
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Success",
        description: "Generated todos successfully"
      });
    }
  });

  return (
    <Button
      onClick={() => mutation.mutate()}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Wand2 className="mr-2 h-4 w-4" />
      )}
      Generate Todos
    </Button>
  );
}
