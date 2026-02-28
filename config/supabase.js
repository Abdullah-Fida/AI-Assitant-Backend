// Add this TEMPORARY debug code at the TOP of your index.js
console.log('🔍 ENV CHECK:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ EXISTS' : '❌ MISSING');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ EXISTS' : '❌ MISSING');

// If missing, crash with clear message
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('❌ CRITICAL: Environment variables missing!');
    throw new Error('Missing Supabase environment variables');
}