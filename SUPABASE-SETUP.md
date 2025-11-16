# Supabase Setup Guide for SuperDesk

## What You Need to Provide

I've set up the authentication system for SuperDesk. Now you need to provide your Supabase credentials in the `.env` files.

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project: https://app.supabase.com/
2. Select your SuperDesk project
3. Go to **Settings** → **API**
4. You'll find two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon/Public Key** (a long string starting with `eyJ...`)

### Step 2: Update Environment Files

#### For Web Client (`client/.env`):
```
REACT_APP_SUPABASE_URL=https://your-project-url.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### For Agent (`agent/.env`):
```
SUPABASE_URL=https://your-project-url.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Configure Supabase Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** provider is enabled
3. Enable **"Enable email confirmations"** if you want users to verify their email
4. Or disable it for faster OTP-only flow (recommended for testing)

### Step 4: Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the "Magic Link" template (used for OTP emails)
3. Make sure the OTP email template is enabled

### Step 5: Test the Authentication

After updating the `.env` files:

1. **Restart both applications** (client and agent)
2. Try the OTP flow:
   - Enter your email
   - Click "Send OTP"
   - Check your email for the 6-digit code
   - Enter the code and verify
3. Or use the **"Continue Without Auth"** button to bypass for testing

## Features Implemented

✅ **OTP Email Authentication**
- Send OTP code to email
- Verify OTP code
- Secure Supabase auth

✅ **Bypass Option (Testing Only)**
- Yellow "Continue Without Auth" button
- Skip authentication for development

✅ **Post-Auth Dashboard**
- 30% left sidebar navigation
- 70% right content area
- Share Screen view with session management
- Friends, Messages, and File Transfer placeholders

✅ **Both Web and Agent**
- Consistent authentication flow
- Same OTP system
- Matching UI/UX

## Security Notes

- Never commit `.env` files to git (they're in `.gitignore`)
- Keep your `SUPABASE_ANON_KEY` private
- The "Continue Without Auth" button should be removed before production
- Use Supabase Row Level Security (RLS) policies for database access

## Next Steps

Once authentication is working:
1. Remove the "Continue Without Auth" button
2. Implement friends system with Supabase database
3. Implement messaging with Supabase Realtime
4. Implement file transfer with Supabase Storage
