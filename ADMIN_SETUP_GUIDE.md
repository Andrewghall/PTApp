# Admin Account Setup Guide

This guide will help you create an admin account to access the PT Business App admin portal.

## Quick Setup (Recommended)

### Step 1: Access Your Supabase Dashboard
1. Go to [supabase.com](https://supabase.com) and log in
2. Select your PT Business App project

### Step 2: Create Admin User via Supabase
1. In the left sidebar, click **Authentication**
2. Click on the **Users** tab
3. Click **Add user** (or **Invite user**)
4. Fill in the form:
   - **Email**: `admin@ptapp.com` (or your preferred email)
   - **Password**: `PTAdmin2024!` (or your preferred password)
   - **Auto Confirm User**: Toggle this **ON** (important!)
5. Click **Create user** or **Send invitation**

### Step 3: Set Admin Role
1. In the left sidebar, click **Table Editor**
2. Select the **profiles** table
3. Find the row with email `admin@ptapp.com`
4. Click on the row to edit it
5. Change the **role** field from `client` to `admin`
6. Save the changes

### Step 4: Login to the App
1. Open the PT Business App
2. Login with:
   - **Email**: `admin@ptapp.com`
   - **Password**: `PTAdmin2024!`
3. You should now see the **Admin** tab in the bottom navigation

## Alternative: SQL Method

If you prefer using SQL, you can run these commands in the Supabase SQL Editor:

```sql
-- After creating the user in Authentication > Users, run this:

UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@ptapp.com';

-- Verify it worked:
SELECT id, email, role, created_at
FROM profiles
WHERE email = 'admin@ptapp.com';
```

## Default Credentials

For quick testing, you can use these default credentials:

```
Email: admin@ptapp.com
Password: PTAdmin2024!
```

**⚠️ SECURITY WARNING**: Change these credentials immediately after your first login, especially for production use!

## Features Available to Admin

Once logged in as admin, you can access:

### 1. **Admin Dashboard** (Admin Tab)
- Business overview with KPIs
- Total clients, monthly revenue, session stats
- Gender demographics and quick stats

### 2. **Schedule Management**
- View upcoming sessions
- Create weekly slot schedules
- Manage session capacity

### 3. **Client Management**
- View all clients
- Award/deduct credits
- View client details and credit balances

### 4. **Pricing Packs**
- Create credit packages
- Set pricing (in euros €)
- Offer referral bonuses

### 5. **Block Bookings** (NEW!)
- Pre-book recurring sessions for regular clients
- Set up weekly patterns (e.g., every Monday at 10am)
- See payment coverage (how far client credits will go)
- Pause/resume or delete recurring patterns

## Troubleshooting

### "I don't see the Admin tab"
- Make sure you set the role to `admin` in the profiles table
- Log out and log back in
- Check the profiles table to confirm role = 'admin'

### "Can't login with credentials"
- Make sure you enabled "Auto Confirm User" when creating the account
- Check the Authentication > Users tab to see if the user exists
- Try resetting the password in Supabase Dashboard

### "Profile doesn't exist"
- The profile is auto-created on first login
- Make sure to login at least once before setting the admin role
- If needed, manually create the profile using SQL

## Creating Additional Admin Users

To create more admin accounts:

1. Repeat **Step 2** with a different email
2. After the user logs in once (to create their profile)
3. Follow **Step 3** to set their role to `admin`

## Security Best Practices

1. **Change default password** immediately
2. **Use strong passwords** (12+ characters, mix of letters, numbers, symbols)
3. **Don't share** admin credentials
4. **Create individual admin accounts** for each PT staff member
5. **Regularly review** user roles in the profiles table
6. **Enable 2FA** in Supabase settings (if available)

## Need Help?

If you encounter issues:
1. Check the Supabase Dashboard logs
2. Verify the user exists in Authentication > Users
3. Verify the profile exists in Table Editor > profiles
4. Ensure role is set to 'admin' (not 'Admin' or 'ADMIN')
5. Try logging out and back in
