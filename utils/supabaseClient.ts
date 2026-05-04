
import { createClient } from '@supabase/supabase-js';

// این مقادیر مستقیماً بر اساس اطلاعات ارسالی شما تنظیم شده است
const supabaseUrl = 'https://eorrsjjutshavmzvpmcz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcnJzamp1dHNoYXZtenZwbWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NDkwMzgsImV4cCI6MjA5MTEyNTAzOH0.uNIxdpcu3qd4FI-BNcOvIn84yUJwk1DTlAddkfad8cs';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and anon key are required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
