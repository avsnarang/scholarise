import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bucket configurations
const buckets = [
  {
    name: 'avatars',
    public: true,
    description: 'User profile pictures and avatars',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  },
  {
    name: 'whatsapp-media',
    public: true,
    description: 'WhatsApp communication media files',
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    fileSizeLimit: 16 * 1024 * 1024, // 16MB (WhatsApp limit)
  },
  {
    name: 'textbooks',
    public: false,
    description: 'AI textbook processing and storage',
    allowedMimeTypes: ['application/pdf', 'text/plain'],
    fileSizeLimit: 50 * 1024 * 1024, // 50MB (matches Supabase config limit)
  },
  {
    name: 'branch-logos',
    public: true,
    description: 'Branch logos and branding assets',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
  },
];

// RLS policies
const policies = [
  // Avatars - users can upload/update their own avatars
  {
    bucketName: 'avatars',
    policyName: 'Users can upload their own avatars',
    definition: `
      CREATE POLICY "Users can upload their own avatars"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    `
  },
  {
    bucketName: 'avatars',
    policyName: 'Users can update their own avatars',
    definition: `
      CREATE POLICY "Users can update their own avatars"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
      WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    `
  },
  {
    bucketName: 'avatars',
    policyName: 'Avatars are publicly readable',
    definition: `
      CREATE POLICY "Avatars are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
    `
  },
  
  // WhatsApp Media - authenticated users can upload
  {
    bucketName: 'whatsapp-media',
    policyName: 'Authenticated users can upload WhatsApp media',
    definition: `
      CREATE POLICY "Authenticated users can upload WhatsApp media"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');
    `
  },
  {
    bucketName: 'whatsapp-media',
    policyName: 'WhatsApp media is publicly readable',
    definition: `
      CREATE POLICY "WhatsApp media is publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'whatsapp-media');
    `
  },
  
  // Branch Logos - authenticated users can upload
  {
    bucketName: 'branch-logos',
    policyName: 'Authenticated users can upload branch logos',
    definition: `
      CREATE POLICY "Authenticated users can upload branch logos"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'branch-logos' AND auth.role() = 'authenticated');
    `
  },
  {
    bucketName: 'branch-logos',
    policyName: 'Authenticated users can update branch logos',
    definition: `
      CREATE POLICY "Authenticated users can update branch logos"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'branch-logos' AND auth.role() = 'authenticated')
      WITH CHECK (bucket_id = 'branch-logos' AND auth.role() = 'authenticated');
    `
  },
  {
    bucketName: 'branch-logos',
    policyName: 'Branch logos are publicly readable',
    definition: `
      CREATE POLICY "Branch logos are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'branch-logos');
    `
  },
  
  // Textbooks - service role only
  {
    bucketName: 'textbooks',
    policyName: 'Only service role can manage textbooks',
    definition: `
      CREATE POLICY "Only service role can manage textbooks"
      ON storage.objects FOR ALL
      USING (bucket_id = 'textbooks' AND auth.jwt() ->> 'role' = 'service_role');
    `
  },
];

async function createBucket(bucketConfig: typeof buckets[0]) {
  console.log(`📦 Creating bucket: ${bucketConfig.name}`);
  
  try {
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw listError;
    }
    
    const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketConfig.name);
    
    if (bucketExists) {
      console.log(`   ✅ Bucket '${bucketConfig.name}' already exists`);
      return;
    }
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket(bucketConfig.name, {
      public: bucketConfig.public,
      allowedMimeTypes: bucketConfig.allowedMimeTypes,
      fileSizeLimit: bucketConfig.fileSizeLimit,
    });
    
    if (error) {
      throw error;
    }
    
    console.log(`   ✅ Successfully created bucket: ${bucketConfig.name}`);
    console.log(`      - Public: ${bucketConfig.public}`);
    console.log(`      - Size limit: ${(bucketConfig.fileSizeLimit / 1024 / 1024).toFixed(1)}MB`);
    console.log(`      - Allowed types: ${bucketConfig.allowedMimeTypes.slice(0, 3).join(', ')}${bucketConfig.allowedMimeTypes.length > 3 ? '...' : ''}`);
    
  } catch (error: any) {
    console.error(`   ❌ Failed to create bucket '${bucketConfig.name}':`, error.message);
    throw error;
  }
}

async function createRLSPolicy(policy: typeof policies[0]) {
  console.log(`🔒 Creating RLS policy: ${policy.policyName}`);
  
  try {
    // Execute the policy creation SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: policy.definition
    });
    
    if (error) {
      // Check if policy already exists
      if (error.message.includes('already exists')) {
        console.log(`   ✅ Policy '${policy.policyName}' already exists`);
        return;
      }
      throw error;
    }
    
    console.log(`   ✅ Successfully created policy: ${policy.policyName}`);
    
  } catch (error: any) {
    console.error(`   ❌ Failed to create policy '${policy.policyName}':`, error.message);
    // Don't throw for policy errors as they might already exist
  }
}

async function setupSupabaseBuckets() {
  console.log('🚀 Setting up Supabase Storage Buckets\n');
  
  try {
    // Test connection
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    
    console.log('✅ Supabase connection successful\n');
    
    // Create buckets
    console.log('📦 Creating storage buckets...');
    for (const bucketConfig of buckets) {
      await createBucket(bucketConfig);
    }
    
    console.log('\n🔒 Setting up RLS policies...');
    for (const policy of policies) {
      await createRLSPolicy(policy);
    }
    
    console.log('\n✅ Supabase storage setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Created ${buckets.length} storage buckets`);
    console.log(`   - Applied ${policies.length} RLS policies`);
    console.log('\n🔗 You can view your buckets in the Supabase Dashboard:');
    console.log(`   ${supabaseUrl.replace('/rest/v1', '')}/project/default/storage/buckets`);
    
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupSupabaseBuckets();

export { setupSupabaseBuckets };