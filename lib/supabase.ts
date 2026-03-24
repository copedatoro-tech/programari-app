import { createClient } from '@supabase/supabase-js';

// Atenție: Aceste date le iei din Supabase -> Settings -> API
const supabaseUrl = 'https://zzrubdbngjfwurdwxtwf.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnViZGJuZ2pmd3VyZHd4dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkyMTgsImV4cCI6MjA4ODQ4NTIxOH0.6uw6yzCs5OfCP7xqWshzPQP36bCPxi2LU0QtpwsvnOo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);