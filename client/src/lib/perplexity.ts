import { insertTodoSchema } from "@shared/schema";

const API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;

export async function generateTodos(): Promise<{ title: string; category: string; description?: string }[]> {
  const prompt = `Generate a comprehensive list of todos for moving into a new apartment. Format the response as a JSON array with objects containing "title" (string), "category" (one of: Pre-Move, Packing, Moving Day, Post-Move, Utilities, Documentation, Shopping, Repairs), and optionally "description" (string). Focus on important tasks only. Limit to 10 items.`;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates structured moving-related todos in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error("Failed to generate todos");
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const todos = JSON.parse(content);
    return todos.map((todo: any) => ({
      title: todo.title,
      category: todo.category,
      description: todo.description
    }));
  } catch (e) {
    throw new Error("Failed to parse generated todos");
  }
}
