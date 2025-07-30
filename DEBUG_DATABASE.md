# 🔍 Database Debug Guide

Based on your logs, the OAuth is working perfectly but the database insert is hanging. Here are the most likely causes and solutions:

## 🚨 Most Likely Issue: RLS (Row Level Security) Policies

Your Supabase `users` table likely has RLS enabled but no policies allowing authenticated users to insert their own profiles.

### Quick Fix:

1. **Go to Supabase Dashboard** → **Table Editor** → **users table**
2. **Click on RLS** (Row Level Security)
3. **Add this policy:**

```sql
-- Policy Name: "Users can insert their own profile"
-- Operation: INSERT
-- Target: authenticated
-- Using expression: auth.uid() = id
-- Check expression: auth.uid() = id
```

**OR** temporarily disable RLS for testing:

```sql
-- In Supabase SQL Editor, run:
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

## 🔧 Alternative: Check Database Connection

Add this test function to your app to verify database connectivity:

```typescript
// Add this to your sign-in button temporarily
const testDatabase = async () => {
  console.log('🧪 Testing database connection...');
  
  try {
    // Test 1: Check current session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🧪 Session test:', session ? 'Found' : 'None');
    
    // Test 2: Try to query users table
    const { data, error } = await supabase.from('users').select('count(*)');
    console.log('🧪 Users table query:', error ? 'Failed' : 'Success');
    if (error) console.log('🧪 Query error:', error);
    
    // Test 3: Try simple insert test
    const testData = { 
      id: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
      verified: false,
      verification_status: 'pending'
    };
    
    const { error: insertError } = await supabase
      .from('users')
      .insert(testData)
      .select();
      
    console.log('🧪 Insert test:', insertError ? 'Failed' : 'Success');
    if (insertError) console.log('🧪 Insert error:', insertError);
    
    // Clean up test data
    await supabase.from('users').delete().eq('id', testData.id);
    
  } catch (error) {
    console.error('🧪 Database test failed:', error);
  }
};

// Call this before trying OAuth
testDatabase();
```

## 🎯 Expected Behavior

After fixing RLS, you should see these logs:

```
🔍 [Profile] Checking for existing user profile in database...
📄 [Profile] Existing profile - found: no  
🔄 [Profile] Creating new user profile...
📝 [Profile] Insert result - user: created
✅ [Profile] New user profile created successfully
```

## 📋 Quick Checklist

- [ ] Check RLS policies on `users` table
- [ ] Verify database table exists with correct schema
- [ ] Test database connectivity with the function above
- [ ] Check Supabase project settings/permissions

The OAuth is working perfectly - this is purely a database permissions issue!