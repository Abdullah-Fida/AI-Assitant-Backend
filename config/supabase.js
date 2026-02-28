const { createClient } = require('@supabase/supabase-js');

// IMPORTANT: for security this should be provided via environment variables
// set SUPABASE_URL and SUPABASE_KEY in your deployment platform (Vercel, local .env during dev)
const supabaseUrl = process.env.SUPABASE_URL || 'https://kkkszbjdwzipujvmmcbd.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtra3N6Ympkd3ppcHVqdm1tY2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIxMTY4MywiZXhwIjoyMDg1Nzg3NjgzfQ.QfBevNvjExXsvCy3DpULiU4iyaLYlv_eRKjHtivfqQw';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;