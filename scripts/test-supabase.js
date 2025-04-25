import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');

    // Try to query the database directly
    const { data, error } = await supabase
      .from('pg_tables')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error querying database:', error.message);
      return;
    }

    console.log('Successfully connected to Supabase database!');
    console.log('Tables:', data);

    // Try to create a test table
    console.log('Attempting to create a test table...');
    const { error: createError } = await supabase.rpc('create_test_table');

    if (createError) {
      console.error('Error creating test table:', createError.message);
      console.log('Trying direct SQL execution...');

      const { error: sqlError } = await supabase.rpc('execute_sql', {
        sql_query: 'CREATE TABLE IF NOT EXISTS test_connection (id SERIAL PRIMARY KEY, name TEXT)'
      });

      if (sqlError) {
        console.error('Error executing SQL:', sqlError.message);
        return;
      }

      console.log('Successfully created test table!');
    } else {
      console.log('Successfully created test table!');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testConnection();
