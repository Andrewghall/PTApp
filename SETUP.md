# PT App - Quick Setup Guide

## ✅ What's Been Built

Your PT business app is now **fully functional** with real features:

### Client Features
- ✅ **Dashboard** - Shows real credit balance, next booking, recent workouts
- ✅ **Booking System** - Weekly calendar, book/cancel sessions, credit deduction
- ✅ **Workout Logging** - Fast FitNotes-style logging with sets/reps
- ✅ **Analytics** - Track progress, personal records, workout history
- ✅ **Credits System** - Full transaction tracking

### Admin Features
- ✅ **Schedule Management** - Create weekly slots (Mon-Fri, 2 sessions/day)
- ✅ **Client Management** - View all clients, adjust credits
- ✅ **Pricing** - Configurable credit packs (no code changes needed)

---

## 🚀 Getting Started

### 1. **Run the Seed Data** (IMPORTANT!)

Go to your Supabase dashboard → SQL Editor → paste and run:

```bash
/Users/andrewhall/PTApp/seed-data-complete.sql
```

This creates:
- 30+ exercises (squats, bench, deadlift, etc.)
- 4 credit packs (£25 single → £400 for 20 pack)
- 40 PT slots for the next 4 weeks (Mon-Fri, 7:30-9:30 & 9:30-11:30)
- Sample training programmes

### 2. **Create Test Accounts**

**Client Account:**
1. Run the app: `npm start`
2. Sign up with any email
3. Confirm email (check inbox)
4. Login

**Admin Account:**
1. Sign up another account
2. Go to Supabase → Table Editor → `profiles`
3. Find the user, set `role` to `admin`
4. Login again - you'll see the Admin tab!

### 3. **Test the Full Flow**

1. **As Admin:**
   - Go to Admin tab
   - View upcoming slots
   - Add credits to a test client (click "Adjust")

2. **As Client:**
   - Dashboard shows your credit balance
   - Book → Select a session → Confirm (uses 1 credit)
   - Workout → Add exercise → Log sets with weight/reps
   - Analytics → View progress charts

---

## 📱 Running the App

```bash
# Web (fastest for testing)
npm run web

# iOS
npm run ios

# Android
npm run android

# Build for production
npm run build
```

---

## 🗄️ Database Schema

Already set up in Supabase:
- `profiles` - User accounts (client/admin roles)
- `client_profiles` - Client details (name, goals, injuries)
- `credit_balances` + `credit_transactions` - Full audit trail
- `slots` + `bookings` - PT session scheduling
- `exercises` - Master list
- `workouts` + `workout_exercises` + `set_entries` - Workout logging
- `programmes` - Training templates
- `credit_packs` - Pricing tiers

---

## 🎯 Key Features Explained

### Credits System
- **Purchase:** Buy packs (5/10/20 credits) with auto-discounts
- **Booking:** 1 credit deducted when booking confirmed
- **Cancellation:** Full refund if cancelled (configurable policy)
- **Admin:** Can add/remove credits with notes

### Booking Flow
1. Client browses weekly calendar (Mon-Fri)
2. Sees available spots (6 max per slot)
3. Confirms booking → credit deducted
4. Cancel anytime → credit refunded

### Workout Logging (FitNotes-style)
- **Fast:** Add exercise → log set → enter weight/reps
- **Smart:** Auto-fills previous set values
- **History:** See all workouts with full set breakdown

### Admin Portal
- **One-click:** Create 4 weeks of slots (40 sessions)
- **No code:** Adjust pricing in database directly
- **Oversight:** See all bookings, client credits, utilization

---

## 💳 Payment Integration (Next Step)

The Stripe integration is installed but not connected yet. To enable payments:

1. Get Stripe API keys (test mode)
2. Add to `.env`:
   ```
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   STRIPE_SECRET_KEY=sk_test_xxx
   ```
3. Implement payment flow in BookingScreen

---

## 🔐 Security Notes

- ✅ Row Level Security (RLS) enabled
- ✅ Users can only see/edit their own data
- ✅ Admins have elevated access
- ✅ Email confirmation required for signup
- ✅ Password min 6 characters

---

## 📊 Current Limitations

1. **Charts:** Analytics shows data but no visual graph yet (placeholder)
2. **Payments:** Stripe integration ready but not connected
3. **Push Notifications:** Not implemented
4. **Offline Mode:** Workout logging requires internet

---

## 🐛 Troubleshooting

**"No credits remaining"**
- As admin, go to Admin tab → Clients → Adjust credits

**"No slots available"**
- Run the seed data SQL script
- Or use Admin → "Create Weekly Slots"

**"Email not confirmed"**
- Check inbox for Supabase confirmation email
- Or manually confirm in Supabase → Authentication → Users

**Build errors**
- Clear cache: `npx expo start -c`
- Reinstall: `rm -rf node_modules && npm install`

---

## 🎉 You're Ready!

The PT can start using this **immediately** for:
- Booking clients into sessions
- Tracking credits and payments
- Clients logging workouts
- Viewing progress analytics

All data is real, stored in Supabase, and persists across sessions.

---

## Next Steps

1. Run seed data
2. Create admin account
3. Create 1-2 test client accounts
4. Award some credits
5. Book sessions and test the flow
6. Deploy to web (Vercel) or mobile stores (EAS Build)
