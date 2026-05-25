import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aoyrxflrmybeujoodjxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveXJ4ZmxybXliZXVqb29kanhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDYyMzAsImV4cCI6MjA5NDg4MjIzMH0.hFmLELkky4e4fd_Y_M6FprdwwK7aElWzAy4BT_zRu8A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('Testing Select...');
  const { data, error } = await supabase.from('app_state').select('*').limit(1);
  if (error) {
    console.error('Select Error:', error);
  } else {
    console.log('Select Success:', data);
  }

  console.log('Testing Upsert...');
  const { error: upsertError } = await supabase.from('app_state').upsert({ id: 1, data: { test: true } });
  if (upsertError) {
    console.error('Upsert Error:', upsertError);
  } else {
    console.log('Upsert Success!');
  }
}

testSupabase();
