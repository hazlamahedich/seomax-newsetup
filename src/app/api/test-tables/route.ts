import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

/**
 * Lists the schema information for key tables in the database
 * Used for debugging database structure issues
 */
export async function GET() {
  const adminClient = createAdminClient();
  const results: Record<string, any> = {};
  
  try {
    console.log('[TestTables] Testing database table access...');
    
    // Get content_pages table information
    try {
      console.log('[TestTables] Querying content_pages schema...');
      
      // First check if we can access the table at all
      const { data: contentPagesCount, error: countError } = await adminClient
        .from('content_pages')
        .select('count', { count: 'exact', head: true });
      
      if (countError) {
        console.error('[TestTables] Error accessing content_pages:', countError);
        results.contentPages = {
          error: countError.message,
          table: 'content_pages',
          accessible: false
        };
      } else {
        // Get a sample row to inspect structure
        const { data: sampleRow, error: rowError } = await adminClient
          .from('content_pages')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (rowError) {
          console.error('[TestTables] Error fetching sample row from content_pages:', rowError);
          results.contentPages = {
            error: rowError.message,
            table: 'content_pages',
            accessible: true,
            count: contentPagesCount,
            structure: 'unknown'
          };
        } else {
          // Get column information from information_schema
          const { data: columnInfo, error: columnError } = await adminClient
            .rpc('get_table_columns', { table_name: 'content_pages' });
          
          results.contentPages = {
            accessible: true,
            count: contentPagesCount,
            sampleRow: sampleRow ? { 
              id: sampleRow.id,
              url: sampleRow.url,
              title: sampleRow.title,
              url_length: sampleRow.url ? sampleRow.url.length : 0,
              has_url_column: sampleRow.hasOwnProperty('url')
            } : null,
            columnInfo: columnInfo || null,
            columnError: columnError ? columnError.message : null
          };
        }
      }
    } catch (err: any) {
      console.error('[TestTables] Exception accessing content_pages:', err);
      results.contentPages = {
        error: err?.message || 'Unknown error',
        table: 'content_pages',
        accessible: false
      };
    }
    
    // Get competitors table information
    try {
      console.log('[TestTables] Querying competitors schema...');
      
      // First check if we can access the table at all
      const { data: competitorsCount, error: countError } = await adminClient
        .from('competitors')
        .select('count', { count: 'exact', head: true });
      
      if (countError) {
        console.error('[TestTables] Error accessing competitors:', countError);
        results.competitors = {
          error: countError.message,
          table: 'competitors',
          accessible: false
        };
      } else {
        // Get a sample row to inspect structure
        const { data: sampleRow, error: rowError } = await adminClient
          .from('competitors')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (rowError) {
          console.error('[TestTables] Error fetching sample row from competitors:', rowError);
          results.competitors = {
            error: rowError.message,
            table: 'competitors',
            accessible: true,
            count: competitorsCount,
            structure: 'unknown'
          };
        } else {
          // Get column information from information_schema
          const { data: columnInfo, error: columnError } = await adminClient
            .rpc('get_table_columns', { table_name: 'competitors' });
          
          results.competitors = {
            accessible: true,
            count: competitorsCount,
            sampleRow: sampleRow ? { 
              id: sampleRow.id,
              url: sampleRow.url,
              name: sampleRow.name,
              project_id: sampleRow.project_id,
              metrics: sampleRow.metrics ? true : false,
              url_length: sampleRow.url ? sampleRow.url.length : 0,
              has_metrics_column: sampleRow.hasOwnProperty('metrics')
            } : null,
            columnInfo: columnInfo || null,
            columnError: columnError ? columnError.message : null
          };
        }
      }
    } catch (err: any) {
      console.error('[TestTables] Exception accessing competitors:', err);
      results.competitors = {
        error: err?.message || 'Unknown error',
        table: 'competitors',
        accessible: false
      };
    }
    
    // Create a function to get table columns if not exists
    try {
      console.log('[TestTables] Creating get_table_columns function if it doesn\'t exist...');
      
      const createFunctionSql = `
      CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
      RETURNS TABLE(
        column_name text,
        data_type text,
        character_maximum_length integer,
        is_nullable text,
        column_default text
      )
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT
          column_name::text,
          data_type::text,
          character_maximum_length::integer,
          is_nullable::text,
          column_default::text
        FROM
          information_schema.columns
        WHERE
          table_name = $1
          AND table_schema = 'public'
        ORDER BY
          ordinal_position;
      $$;
      `;
      
      const { error: functionError } = await adminClient.rpc('get_table_columns', { table_name: 'competitors' });
      
      if (functionError && functionError.message.includes('does not exist')) {
        // Function doesn't exist, create it
        const { error: createError } = await adminClient.rpc('execution_sql', { sql: createFunctionSql });
        
        if (createError) {
          console.error('[TestTables] Error creating get_table_columns function:', createError);
          results.function = {
            created: false,
            error: createError.message
          };
        } else {
          console.log('[TestTables] Successfully created get_table_columns function');
          results.function = { created: true };
        }
      } else {
        console.log('[TestTables] get_table_columns function already exists');
        results.function = { exists: true };
      }
    } catch (err: any) {
      console.error('[TestTables] Error checking/creating function:', err);
      results.function = {
        error: err?.message || 'Unknown error'
      };
    }
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('[TestTables] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      results
    }, { status: 500 });
  }
} 