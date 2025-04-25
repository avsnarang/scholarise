// Script to create a user in Supabase Auth
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Create Supabase client with service role key for admin operations
const supabaseUrl = 'https://dkgorxvkwdkxvvjhupyk.supabase.co';
const supabaseServiceKey = 'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ29yeHZrd2RreHZ2amh1cHlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTEzMjczNywiZXhwIjoyMDYwNzA4NzM3fQ.Ox7cuQ1c6-qKBReo38QU5_mvDfhcKullO82yRvmC78o';

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function main() {
  try {
    console.log('Creating user in Supabase Auth...');

    const email = 'avsnarang@tsh.edu.in';
    const password = 'Aditya@357911#';

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (error) {
      console.error('Error creating user in Supabase Auth:', error);
      return;
    }

    console.log('User created in Supabase Auth:', data.user.id);
    console.log('User can now log in with the provided credentials');

  } catch (error) {
    console.error('Error creating user:', error);
  }
}

main();
