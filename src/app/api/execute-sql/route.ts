import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

/**
 * POST /api/execute-sql
 * Execute SQL statement directly on the database
 * Requires admin privileges
 * Body: { sql: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sql } = body;
    
    if (!sql) {
      return NextResponse.json(
        { error: 'SQL statement is required' },
        { status: 400 }
      );
    }
    
    // Log the SQL being executed
    console.log(`[ExecuteSQL] Executing SQL statement: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
    
    // Get admin client
    const adminClient = createAdminClient();
    
    // Execute the SQL
    const { data, error } = await adminClient.rpc('execute_sql', { query: sql });
    
    if (error) {
      console.error('[ExecuteSQL] Error executing SQL:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      result: data
    });
  } catch (error: any) {
    console.error('[ExecuteSQL] Error in SQL execution:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/execute-sql?table=table_name
 * Examine table structure 
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    
    if (!table) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }
    
    console.log(`[ExecuteSQL] Examining table structure for: ${table}`);
    
    // Get admin client
    const adminClient = createAdminClient();
    
    // Query for table information
    const sql = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM 
        information_schema.columns 
      WHERE 
        table_name = '${table}'
        AND table_schema = 'public'
      ORDER BY 
        ordinal_position;
    `;
    
    // Execute the SQL
    const { data, error } = await adminClient.rpc('execute_sql', { query: sql });
    
    if (error) {
      console.error(`[ExecuteSQL] Error getting structure for table ${table}:`, error);
      
      // Check if the error is due to missing execute_sql function
      if (error.message.includes('function execute_sql') && error.message.includes('does not exist')) {
        console.log('[ExecuteSQL] Creating execute_sql function...');
        
        // Create the execute_sql function
        const createFunctionSql = `
          CREATE OR REPLACE FUNCTION execute_sql(query text)
          RETURNS json
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result json;
          BEGIN
            EXECUTE query INTO result;
            RETURN result;
          EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
              'error', SQLERRM,
              'detail', SQLSTATE
            );
          END;
          $$;
        `;
        
        // Execute directly using Postgres client
        const { error: createError } = await adminClient.rpc('execute_sql', { query: createFunctionSql });
        
        if (createError) {
          console.error('[ExecuteSQL] Error creating execute_sql function:', createError);
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to create execute_sql function. Database operations require this function.',
              original_error: error.message
            },
            { status: 500 }
          );
        }
        
        // Try again with the newly created function
        const { data: retryData, error: retryError } = await adminClient.rpc('execute_sql', { query: sql });
        
        if (retryError) {
          console.error('[ExecuteSQL] Error after creating function:', retryError);
          return NextResponse.json(
            { success: false, error: retryError.message },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          table,
          columns: retryData,
          note: 'Created execute_sql function'
        });
      }
      
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    // Check for metrics column specifically
    const metricsColumn = data.find((col: any) => col.column_name === 'metrics');
    
    return NextResponse.json({
      success: true,
      table,
      columns: data,
      has_metrics_column: !!metricsColumn,
      metrics_column: metricsColumn
    });
  } catch (error: any) {
    console.error('[ExecuteSQL] Error in table examination:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 