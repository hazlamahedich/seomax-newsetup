import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses JSON from a response by catching and handling potential JSON parsing errors
 */
export async function safeParseJSON(response: Response) {
  // Ensure we have a response
  if (!response) {
    throw new Error('No response received');
  }
  
  // Clone the response to ensure we can read it
  const clonedResponse = response.clone();
  
  try {
    // Attempt to parse as JSON
    return await response.json();
  } catch (error) {
    // Get the text and try to help debug
    const text = await clonedResponse.text();
    console.error('JSON parse error:', error);
    console.error('Response text:', text || '(empty response)');
    
    // If we have text, try to parse it manually but safely
    if (text && text.trim()) {
      try {
        return JSON.parse(text);
      } catch (secondError) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
      }
    }
    
    throw new Error('Empty or invalid JSON response');
  }
}
