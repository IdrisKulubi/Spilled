/**
 * Test Supabase connectivity
 */

export const testSupabaseConnection = async () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  console.log('Key exists:', !!supabaseKey);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return false;
  }
  
  try {
    // Test basic connectivity
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (response.ok) {
      console.log('✅ Supabase connection successful');
      return true;
    } else {
      console.error('❌ Supabase connection failed:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
};