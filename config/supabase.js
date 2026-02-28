const { createClient } = require('@supabase/supabase-js');

// ONLY use environment variables - NO FALLBACKS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Add validation to crash early if variables are missing
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ CRITICAL ERROR: Missing Supabase environment variables');
    console.error('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ MISSING');
    console.error('SUPABASE_KEY:', supabaseKey ? '✅ Set' : '❌ MISSING');
    throw new Error('Supabase environment variables are required');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase client initialized successfully');

module.exports = supabase;