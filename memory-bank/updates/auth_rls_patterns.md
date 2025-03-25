# Authentication and Database Access Patterns

## Authentication Architecture

1. **Authentication Flow**:
   - NextAuth session provider with enhanced error handling
   - ExtendedAuthProvider component for additional validation and features
   - Session validation to prevent invalid user objects
   - Robust user ID validation with multiple checks
   - User object validation with type checking for key properties
   - Supabase client integration with NextAuth for unified authentication

2. **User Validation Pattern**:
   - `isValidUser` function in `session-utils.ts` validates user objects
   - Comprehensive validation checks:
     - Non-null user object
     - Valid ID (non-empty string)
     - Type checking for email and name properties
     - Error handling with try-catch blocks
   - Type safety with TypeScript interfaces
   - Source tracking with `__supabase` marker property

3. **Error Handling Strategy**:
   - Graceful error handling for auth validation failures
   - Empty session fallback for failed requests
   - Session timeout handling with automatic redirects
   - Detailed error logging for debugging
   - User-friendly error messages

## Database Access Pattern

1. **Row-Level Security (RLS) Strategy**:
   - Dual-client approach for database access:
     - Regular client for user-authenticated operations
     - Admin client with service role for bypassing RLS when needed
   - Service clients created with proper environment variables
   - Error handling with fallback mechanisms
   - Performance optimization with connection pooling

2. **Project Access Control**:
   - `checkProjectAccess` function validates user access to projects
   - Security checks using RLS policies for projects table
   - User verification against project ownership
   - Admin override capabilities for specific operations
   - Error handling for access control failures

3. **Service Layer Integration**:
   - Services use appropriate client based on operation context
   - CRUD operations respect access control boundaries
   - Data transformation for client/server exchange
   - Error handling with detailed error objects
   - Logging for security-relevant operations

## AI Response Handling Pattern

1. **Response Parsing Strategy**:
   - Multiple parsing strategies for different response formats:
     - Primary: Standard JSON parsing with error handling
     - Secondary: Text extraction with regex pattern matching
     - Fallback: Line-by-line extraction for malformed responses
   - Prompt engineering for more consistent response formats
   - Response validation before use

2. **Error Handling Approach**:
   - Comprehensive try-catch blocks
   - Fallback mechanisms for parsing failures
   - Default values for missing properties
   - Logging for AI response errors
   - User feedback for service degradation

3. **Prompt Design Pattern**:
   - Clear instructions for response format
   - Examples of expected output
   - Simplified format requests (e.g., comma-separated lists)
   - Context limitation to avoid token overflow
   - Response validation requirements

## Implementation Examples

### Enhanced User Validation in Session Utils

```typescript
export function isValidUser(user: any): boolean {
  try {
    // Check if user exists and has a valid ID
    if (!user) return false;
    
    // Check if ID is valid (non-empty string)
    if (typeof user.id !== 'string' || user.id.trim() === '') return false;
    
    // Validate email if present
    if (user.email !== undefined && typeof user.email !== 'string') return false;
    
    // Validate name if present
    if (user.name !== undefined && user.name !== null && typeof user.name !== 'string') return false;
    
    return true;
  } catch (error) {
    console.error('[SessionUtils] Error validating user:', error);
    return false;
  }
}
```

### Admin Client for RLS Bypass

```typescript
// Create an admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Use admin client for database operation
const { data, error } = await supabaseAdmin
  .from('topic_clusters')
  .insert([{ name, main_keyword, project_id }])
  .select()
  .single();
```

### Multi-strategy AI Response Parsing

```typescript
function extractKeywordsFromResponse(response: string): string[] {
  try {
    // Strategy 1: Try parsing as JSON
    try {
      const jsonResult = JSON.parse(response);
      if (Array.isArray(jsonResult)) {
        return jsonResult.filter(Boolean);
      }
      if (jsonResult.keywords && Array.isArray(jsonResult.keywords)) {
        return jsonResult.keywords.filter(Boolean);
      }
    } catch (jsonError) {
      console.log("JSON parsing failed, trying alternative methods");
    }
    
    // Strategy 2: Try splitting by commas if response looks like a list
    if (response.includes(',')) {
      return response
        .split(',')
        .map(kw => kw.trim())
        .filter(Boolean);
    }
    
    // Strategy 3: Process line by line for keywords
    return response
      .split('\n')
      .map(line => line.replace(/^[0-9.-]*\s*/, '').trim()) // Remove bullet points or numbers
      .filter(Boolean);
  } catch (error) {
    console.error("Failed to extract keywords:", error);
    return [];
  }
}
``` 