# Vercel Deployment Guide - PT Business App

## ✅ DEPLOYMENT STATUS: READY

Your PT app is **ready to deploy** to Vercel. The configuration has been fixed and verified.

---

## 🔧 What Was Fixed

### 1. **Vercel Configuration (vercel.json)**
- ✅ **FIXED**: Updated from legacy builds/routes format to modern buildCommand/outputDirectory
- ✅ **FIXED**: Corrected routing to use SPA rewrites (all routes → index.html)
- ✅ **READY**: Build command points to `npm run build` which runs `expo export --platform web`

**Old Config (broken):**
```json
{
  "builds": [{ "src": "package.json", "use": "@vercel/static-build" }],
  "routes": [{ "src": "/(.*)", "dest": "/dist/$1" }]  // ❌ Wrong
}
```

**New Config (working):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]  // ✅ Correct
}
```

### 2. **Build Verification**
- ✅ **VERIFIED**: `npm run build` completes successfully
- ✅ **VERIFIED**: Outputs to `dist/` directory correctly
- ✅ **VERIFIED**: Generates web bundle: `dist/_expo/static/js/web/AppEntry-*.js`
- ✅ **VERIFIED**: index.html correctly references bundled JS
- ✅ **VERIFIED**: All assets (images, fonts) copied to dist

### 3. **TypeScript Check**
- ✅ **CLEAN**: No TypeScript errors in production files
- ⚠️ **NOTE**: Backup files (`.backup.tsx`, `.old.tsx`) have errors but are NOT included in build

### 4. **Environment Variables**
- ✅ **VERIFIED**: Using `EXPO_PUBLIC_` prefix (correct for Expo)
- ✅ **REQUIRED**: Must set these in Vercel dashboard:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 🚀 Deployment Steps

### Step 1: Verify Local Build (Optional)
```bash
cd /Users/andrewhall/PTApp
npm run build
```
Expected output: `dist/` folder with index.html and `_expo/` directory

### Step 2: Deploy to Vercel

#### Option A: Deploy via CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy from project root
cd /Users/andrewhall/PTApp
vercel

# Follow prompts:
# - Link to existing project or create new
# - Vercel will auto-detect the vercel.json config
# - Build will run automatically
```

#### Option B: Deploy via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your Git repository (or upload files)
4. Vercel will auto-detect settings from `vercel.json`
5. **CRITICAL**: Add environment variables (see Step 3)
6. Click "Deploy"

### Step 3: Configure Environment Variables in Vercel

**REQUIRED - Do this BEFORE first deployment:**

1. Go to your project settings in Vercel dashboard
2. Navigate to "Environment Variables"
3. Add these variables:

| Variable Name | Value | Environment |
|--------------|-------|------------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://lrysavxxoxiqwfhmvazy.supabase.co` | Production, Preview, Development |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |

⚠️ **Security Note**: The anon key is safe to expose client-side (it's in your .env file). Row Level Security (RLS) in Supabase protects your data.

### Step 4: Verify Deployment

After deployment completes:

1. **Check the build logs** in Vercel dashboard
   - Should show: "npm run build" succeeded
   - Should show: "Build Completed" with dist directory

2. **Visit your deployment URL** (e.g., `https://pt-business-app.vercel.app`)
   - Should see login screen
   - Should be able to create account
   - Should be able to sign in

3. **Test critical features:**
   - ✅ Login/Signup works
   - ✅ Dashboard loads
   - ✅ Booking screen loads
   - ✅ Admin screen loads (for admin users)
   - ✅ Navigation tabs work
   - ✅ Supabase connection works

---

## 🗄️ Database Setup (Critical!)

**IMPORTANT**: You must run the database migrations in Supabase BEFORE users can use new features.

### Step 1: Run Database Migrations

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/lrysavxxoxiqwfhmvazy
   - Navigate to: SQL Editor

2. **Copy the migration file**
   - File: `/Users/andrewhall/PTApp/database-migrations.sql`
   - Open the file and copy ALL contents

3. **Execute in Supabase**
   - Paste into SQL Editor
   - Click "Run"
   - Verify: "Success. No rows returned"

4. **Verify tables created:**
   ```sql
   -- Run this query to verify:
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('messages', 'session_notes', 'waitlist', 'slot_notifications');
   ```
   Should return 4 rows.

### Step 2: Update Auth Trigger (CRITICAL!)

Your existing Supabase auth trigger needs updating to handle new signup fields.

**Current trigger location:**
- Supabase Dashboard → Database → Functions → `handle_new_user`

**What to add:**

```sql
-- Update your existing handle_new_user function to include:

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_client_id UUID;
  referrer_client_id UUID;
BEGIN
  -- 1. Create profile
  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );

  -- 2. If client, create client_profile with new fields
  IF COALESCE(new.raw_user_meta_data->>'role', 'client') = 'client' THEN
    INSERT INTO public.client_profiles (
      user_id,
      first_name,
      last_name,
      phone,
      date_of_birth,
      gender
    )
    VALUES (
      new.id,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'phone',
      (new.raw_user_meta_data->>'date_of_birth')::DATE,
      new.raw_user_meta_data->>'gender'
    )
    RETURNING id INTO new_client_id;

    -- 3. Initialize credit balance
    INSERT INTO public.credit_balances (client_id, balance)
    VALUES (new_client_id, 0);

    -- 4. Handle referral code if provided
    IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
      -- Find the referrer by referral code
      SELECT cp.id INTO referrer_client_id
      FROM public.referrals r
      JOIN public.client_profiles cp ON r.referrer_id = cp.id
      WHERE r.referral_code = new.raw_user_meta_data->>'referral_code'
      AND r.status = 'pending'
      LIMIT 1;

      -- Create referral record if referrer found
      IF referrer_client_id IS NOT NULL THEN
        INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (referrer_client_id, new_client_id, 'pending');
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**How to update:**
1. Go to Supabase → Database → Functions
2. Find `handle_new_user` function
3. Click "Edit"
4. Replace function body with code above
5. Save

---

## 🧪 Testing Checklist

After deployment AND database setup, test these flows:

### 1. New User Signup
- [ ] Fill in all fields (email, password, first name, last name, phone, DOB)
- [ ] Select gender (optional)
- [ ] Enter referral code (optional)
- [ ] Submit
- [ ] Verify: "Account created! Check your email to confirm"
- [ ] Check email and confirm
- [ ] Sign in
- [ ] Verify: Dashboard loads

**Database Verification:**
```sql
-- Check that new user was created with all fields:
SELECT * FROM client_profiles WHERE user_id = 'USER_ID_HERE';
-- Should show: phone, date_of_birth, gender
```

### 2. Client Features
- [ ] Dashboard shows correct info
- [ ] Credits screen loads
- [ ] Booking screen shows available slots
- [ ] Messages tab works (shows conversation list)
- [ ] History tab shows booking history
- [ ] Referrals tab shows referral code
- [ ] Workout tab loads
- [ ] Analytics tab loads

### 3. Admin Features (admin user only)
- [ ] Overview dashboard shows KPIs
- [ ] Schedule management works
- [ ] Client list loads
- [ ] Pricing packs display
- [ ] Can create slots
- [ ] Can adjust client credits

### 4. Real-time Features
- [ ] Unread message badge updates
- [ ] Messages appear in real-time
- [ ] Booking counts update

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Blank screen after deployment"
**Cause**: Environment variables not set
**Solution**:
- Go to Vercel → Project Settings → Environment Variables
- Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Redeploy

### Issue 2: "Cannot sign up / error creating account"
**Cause**: Database migrations not run OR auth trigger not updated
**Solution**:
- Run `database-migrations.sql` in Supabase SQL Editor
- Update `handle_new_user` trigger function (see above)

### Issue 3: "404 on page refresh"
**Cause**: Routing configuration issue
**Solution**:
- Verify `vercel.json` has rewrites section (already fixed)
- Redeploy if needed

### Issue 4: "Phone/DOB/Gender not saving"
**Cause**: Auth trigger not updated
**Solution**: Update the `handle_new_user` function in Supabase

### Issue 5: "Messages/History/Referrals tabs not working"
**Cause**: Database tables not created
**Solution**: Run `database-migrations.sql`

---

## 📊 What's Deployed

### Screens (8 total):
1. **Login/Signup** - Enhanced with phone, DOB, gender, referral code
2. **Dashboard** - Client home screen with credits, upcoming sessions
3. **Credits** - Purchase sessions
4. **Booking** - Book available slots
5. **Messages** - Real-time chat with PT
6. **History** - Session history with PT notes
7. **Referrals** - Referral program
8. **Workout** - Workout logging
9. **Analytics** - Performance charts
10. **Admin** - PT dashboard (admin only)

### Database Tables (New):
- `messages` - In-app messaging
- `session_notes` - PT feedback
- `waitlist` - Full session waitlists
- `slot_notifications` - Schedule change notifications

### Enhanced Tables:
- `client_profiles` - Added: phone, date_of_birth, gender
- `referrals` - Added: referral_code, credited, credit_amount
- `bookings` - Added: attended, attended_at, no_show

### Features:
- ✅ Enhanced signup flow
- ✅ Admin Overview Dashboard with KPIs
- ✅ Real-time messaging
- ✅ Session history
- ✅ Referral program
- ✅ 48-hour cancellation policy
- ✅ Unread message badges

---

## 🎯 Next Steps After Deployment

### Immediate (Required):
1. ✅ Deploy to Vercel
2. ✅ Set environment variables
3. ✅ Run database migrations
4. ✅ Update auth trigger
5. ✅ Test signup flow
6. ✅ Test admin access

### Optional Enhancements (Future):
These were designed but not implemented (see `ADMIN_ENHANCEMENT_GUIDE.md`):
- Additional admin tabs (Messages, Notes, Waitlist, Referrals, Analytics)
- Enhanced client performance tracking
- Advanced business analytics
- Automated reminders (requires backend service)

---

## 📞 Support

If deployment fails:
1. Check Vercel build logs
2. Verify environment variables are set
3. Confirm database migrations ran successfully
4. Test locally first: `npm run build` then `npx serve dist`

---

## ✅ Deployment Checklist Summary

- [x] vercel.json fixed
- [x] Build tested locally
- [x] Environment variables documented
- [ ] Deploy to Vercel
- [ ] Set environment variables in Vercel
- [ ] Run database-migrations.sql
- [ ] Update handle_new_user trigger
- [ ] Test signup flow
- [ ] Test all client features
- [ ] Test admin features

**Current Status: READY TO DEPLOY** 🚀
