import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://jafhpkbtxcmzufznnbxc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZmhwa2J0eGNtenVmem5uYnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjMxNjcsImV4cCI6MjA5MDQzOTE2N30.PruNINSYGjCwhsiZhcIFVJRX6ix0zJKQMIJKta3YlEM",
  { auth: { autoRefreshToken: true, persistSession: true, storageKey: "bf_admin_session" } }
);
