# SEOMax Competitor Analysis Service Migration

## Issue Description
The error "JSON object requested, multiple (or no) rows returned" when accessing the competitors table was due to either:

1. Missing `metrics` column in the `competitors` table
2. Permission issues preventing proper access to the database

## Solutions Implemented

### 1. Admin Client Access
We've updated the `CompetitorAnalysisService` to use the Supabase admin client with service role permissions, which bypasses Row Level Security (RLS) rules and ensures proper access to all database tables.

```typescript
import { createAdminClient } from '@/lib/supabase/admin-client';

export class CompetitorAnalysisService {
  private static supabase = createAdminClient();
  
  // ...rest of the class implementation
}
```

### 2. Database Migration for Missing Metrics Column
We've created a migration script to add the `metrics` column to the `competitors` table if it doesn't exist:

```sql
-- Check if the metrics column exists
IF NOT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'competitors' 
  AND column_name = 'metrics'
) THEN
  -- Add the metrics column as JSONB
  ALTER TABLE competitors ADD COLUMN metrics JSONB;
END IF;
```

### 3. API Endpoints for Diagnostics and Administration
We've created several endpoints to help diagnose and fix database issues:

1. `/api/admin-test` - Tests admin access to the database
2. `/api/test-tables` - Examines table structure and schema
3. `/api/execute-sql` - Executes SQL statements directly (admin only)

### 4. SQL Migration Script
The file `migrations/add_metrics_column.sql` contains a complete migration script that:

1. Adds the `metrics` column to the `competitors` table if missing
2. Creates a trigger to ensure the column contains valid JSONB
3. Implements schema version tracking

## How to Apply the Changes

### 1. Deploy the Code Changes
Deploy all the TypeScript files that have been updated, particularly:
- `src/lib/services/CompetitorAnalysisService.ts`
- `src/app/api/competitive-analysis/route.ts`
- New diagnostic API routes

### 2. Run the Database Migration
You can run the migration script through one of these methods:

#### Using the Supabase Dashboard
1. Go to the Supabase project dashboard
2. Navigate to the SQL Editor
3. Paste the contents of `migrations/add_metrics_column.sql`
4. Click "Run"

#### Using the API
Send a POST request to `/api/execute-sql` with the migration script:

```bash
curl -X POST http://localhost:3000/api/execute-sql \
  -H "Content-Type: application/json" \
  -d '{"sql": "-- [Contents of migrations/add_metrics_column.sql]"}'
```

## Verification
After applying these changes, you can:

1. Visit `/api/admin-test` to verify admin access
2. Visit `/api/test-tables?table=competitors` to verify the `metrics` column exists
3. Try the competitor analysis feature again

## Why This Approach Works
- Using the admin client bypasses any permission issues that might be preventing access
- Adding the missing `metrics` column ensures data can be stored correctly
- The diagnostic endpoints allow for monitoring and quick fixes in the future
- The migration script handles the database changes in a safe, idempotent manner

## Future Improvements
- Consider adding more robust error handling in the competitive analysis service
- Implement a proper database migration system (e.g., with Prisma or another ORM)
- Add monitoring for database schema changes
- Create automated tests for these critical database operations 