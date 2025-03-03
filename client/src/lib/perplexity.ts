import { insertTodoSchema } from "@shared/schema";

const API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
const API_URL = "https://api.perplexity.ai/chat/completions";
const DEFAULT_MODEL = "llama-3.1-sonar-small-128k-online";

// Rate limiting variables
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second minimum between requests (adjust as needed)
const MAX_REQUESTS_PER_MINUTE = 10; // Max requests per minute
const requestsInLastMinute: number[] = [];

/**
 * Check rate limits before making an API call
 * @returns {boolean} Whether the request can proceed
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Remove timestamps older than 1 minute
  while (requestsInLastMinute.length > 0 && 
         requestsInLastMinute[0] < now - 60000) {
    requestsInLastMinute.shift();
  }
  
  // Check if we've exceeded the rate limit
  if (requestsInLastMinute.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  // Check if we're sending requests too quickly
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    return false;
  }
  
  return true;
}

/**
 * Make a request to the Perplexity API with rate limiting
 */
async function callPerplexityAPI(messages: any[], model = DEFAULT_MODEL, temperature = 0.2) {
  if (!API_KEY) {
    throw new Error("Perplexity API key is not configured");
  }
  
  if (!checkRateLimit()) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }
  
  try {
    lastRequestTime = Date.now();
    requestsInLastMinute.push(lastRequestTime);
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `API request failed with status ${response.status}: ${
          errorData ? JSON.stringify(errorData) : response.statusText
        }`
      );
    }
    
    return await response.json();
  } catch (error) {
    console.error("Perplexity API error:", error);
    throw error;
  }
}

/**
 * Generate a list of todos for a moving project
 */
export async function generateTodos(): Promise<{ title: string; category: string; description?: string }[]> {
  const prompt = `Generate a comprehensive list of todos for moving into a new apartment. Format the response as a JSON array with objects containing "title" (string), "category" (one of: Pre-Move, Packing, Moving Day, Post-Move, Utilities, Documentation, Shopping, Repairs), and optionally "description" (string). Focus on important tasks only. Limit to 10 items.`;

  const data = await callPerplexityAPI([
    {
      role: "system",
      content: "You are a helpful assistant that generates structured moving-related todos in JSON format."
    },
    {
      role: "user",
      content: prompt
    }
  ]);
  
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

/**
 * Get smart suggestions based on note content
 * @param content The content of the note
 * @returns An array of relevant suggestions
 */
export async function getSmartSuggestions(content: string): Promise<string[]> {
  if (!content || content.length < 10) {
    return [];
  }
  
  const prompt = `Based on the following note, provide 3-5 relevant smart suggestions that might help the user. These could be relevant information sources, actions they should take, or ways to expand on their thinking. Format the response as a JSON array of strings, each containing a single suggestion.
  
  Note content: "${content}"`;
  
  try {
    const data = await callPerplexityAPI([
      {
        role: "system",
        content: "You are a helpful assistant that provides relevant smart suggestions based on note content."
      },
      {
        role: "user",
        content: prompt
      }
    ]);
    
    const responseContent = data.choices[0].message.content;
    const suggestions = JSON.parse(responseContent);
    
    return Array.isArray(suggestions) ? suggestions : [];
  } catch (error) {
    console.error("Error getting smart suggestions:", error);
    return [];
  }
}

/**
 * Expand a note with additional details using Perplexity API
 * @param content The content of the note to expand
 * @param title The title of the note
 * @param tags Any tags associated with the note
 * @returns Expanded content for the note
 */
export async function expandNote(content: string, title: string, tags: string[] = []): Promise<string> {
  if (!content || content.length < 10) {
    throw new Error("Note content is too short to expand");
  }
  
  const tagString = tags.length > 0 ? `Tags: ${tags.join(', ')}` : '';
  
  const prompt = `Expand on the following note by adding more relevant details, examples, or supporting information. Keep the same style and tone, but make it more comprehensive and valuable:
  
  Title: ${title}
  ${tagString}
  
  Content: "${content}"
  
  IMPORTANT FORMATTING INSTRUCTIONS: 
  - ALWAYS use proper markdown links with actual URLs, like: [Moving Companies in Düsseldorf](https://www.movinga.de) or [City Information](https://www.duesseldorf.de)
  - NEVER use numbered citation references like [1], [2], etc.
  - For each fact or detail you add, try to include a real, working URL where the user could learn more
  - Format your response with proper Markdown, including headings (##), bullet points, and emphasis where appropriate
  - DO NOT include references or citations at the end of each paragraph
  - Do not include a separate References section at the end
  
  Please provide only the expanded content, not the original, and format it to be easy to read.`;
  
  try {
    const data = await callPerplexityAPI([
      {
        role: "system",
        content: "You are a helpful assistant that expands notes with relevant and meaningful information. Always provide real, clickable URLs for sources instead of citation references like [1], [2], etc. Do not add citation numbers like [1] at the end of paragraphs."
      },
      {
        role: "user",
        content: prompt
      }
    ], DEFAULT_MODEL, 0.5); // Using slightly higher temperature for creativity
    
    let responseContent = data.choices[0].message.content;
    
    // Debug log to see what Perplexity is returning
    console.log("=== PERPLEXITY API RESPONSE ===");
    console.log(responseContent);
    console.log("===============================");
    
    // Process the response to remove any citation references that might still be present
    responseContent = responseContent.replace(/\[(\d+)\](?!\()/g, '');
    
    // Remove any trailing whitespace after removing citations
    responseContent = responseContent.replace(/\s+\./g, '.');
    responseContent = responseContent.replace(/\s+,/g, ',');
    
    return responseContent;
  } catch (error) {
    console.error("Error expanding note:", error);
    throw new Error("Failed to expand note. Please try again later.");
  }
}

/**
 * Convert markdown to HTML for rendering
 * @param markdown The markdown content to convert
 * @returns HTML string
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  // Basic markdown to HTML conversion
  // Headers
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    
    // Lists
    .replace(/^\s*- (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/^\s*\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
    
    // Markdown links
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Plain URLs - converts URLs that are not already part of a markdown link
    .replace(/(?<!\]\()(?<!\()(https?:\/\/[^\s]+)(?!\))/gim, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Handle citation references like [1], [2], [n], etc. and highlight them
    .replace(/\[((?:\d+)|(?:[a-zA-Z]+))\](?!\()/g, '<span class="citation-ref" style="color: var(--primary); font-weight: bold;">[&#8203;$1&#8203;]</span>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    
    // Inline code
    .replace(/`(.*?)`/gim, '<code>$1</code>');
    
  // Fix adjacent lists
  html = html
    .replace(/<\/ul>\s*<ul>/gim, '')
    .replace(/<\/ol>\s*<ol>/gim, '');
    
  // Convert line breaks to paragraphs
  const paragraphs = html.split(/\n\s*\n/);
  return paragraphs
    .map(p => {
      if (
        !p.trim() || 
        p.startsWith('<h') || 
        p.startsWith('<ul') || 
        p.startsWith('<ol') || 
        p.startsWith('<pre')
      ) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}
