# QUICK FIX - Add Environment Variables to Vercel

## The Problem
Vercel is building the app WITHOUT environment variables, so the Supabase connection fails.

## The Solution (2 minutes)

### Step 1: Add Environment Variables in Vercel

1. **Go to**: https://vercel.com/andrewghall-3747s-projects/pt-app-ten/settings/environment-variables

2. **Add Variable #1:**
   - Name: `EXPO_PUBLIC_SUPABASE_URL`
   - Value: `https://lrysavxxoxiqwfhmvazy.supabase.co`
   - Environment: ✅ Production ✅ Preview ✅ Development
   - Click "Save"

3. **Add Variable #2:**
   - Name: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyeXNhdnh4b3hpcXdmaG12YXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODk1ODAsImV4cCI6MjA4NjU2NTU4MH0._zmVUawN8k9REd6ksdInqWy-HTYh6GXQZVvLw_yaAnk`
   - Environment: ✅ Production ✅ Preview ✅ Development
   - Click "Save"

### Step 2: Trigger Redeploy

1. **Go to**: https://vercel.com/andrewghall-3747s-projects/pt-app-ten/deployments

2. Click the latest deployment (top one)

3. Click the **"..."** menu (three dots)

4. Click **"Redeploy"**

5. Click **"Redeploy"** again to confirm

### Step 3: Wait 2 Minutes

Vercel will rebuild the app with the environment variables. Once done:
- ✅ https://pt-app-ten.vercel.app will load the login screen
- ✅ Supabase connection will work
- ✅ App will be fully functional

---

## Why This Happened

Expo requires environment variables at **build time** (not runtime). When Vercel builds your app, it runs `npm run build` which needs the `EXPO_PUBLIC_*` variables to be set in Vercel's environment.

The local builds had the variables from `.env`, but Vercel's builds didn't have them yet.

---

## After It Works

Once the app loads, you'll need to:

1. **Run database migrations** in Supabase (see `database-migrations.sql`)
2. **Update auth trigger** for new signup fields (see `VERCEL_DEPLOYMENT_GUIDE.md`)
3. **Test signup** with phone/DOB/gender fields

But first, let's get it deployed!
