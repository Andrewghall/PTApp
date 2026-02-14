# PT Business App - React Native with Supabase

A comprehensive Personal Training business management app built with React Native and Supabase.

## Features

### Phase 1: Foundation ✅
- React Native app with TypeScript
- Supabase authentication & database
- Complete data models for PT business
- Login/signup flow
- Role-based navigation (Client/Admin)
- Modern UI with bottom tab navigation

### Upcoming Phases
- **Phase 2**: Client profiles, credits system, enhanced dashboard
- **Phase 3**: Booking system with calendar
- **Phase 4**: Fast FitNotes-style workout logging
- **Phase 5**: Training programmes and assignments
- **Phase 6**: Analytics and progress tracking
- **Phase 7**: PT admin controls
- **Phase 8**: Payment integration
- **Phase 9**: Referral system
- **Phase 10**: Polish and deployment

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Supabase

1. **Create a Supabase Account**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up for a free account

2. **Create a New Project**
   - Click "New Project"
   - Choose your organization
   - Set project name (e.g., "pt-business-app")
   - Set a strong database password
   - Choose a region close to you

3. **Get Project Credentials**
   - Go to Settings > API
   - Copy the **Project URL** and **anon public key**

4. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   - Edit `.env` and replace with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

5. **Run Database Schema**
   - Go to the SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase-schema.sql`
   - Click "Run" to execute the schema

### 3. Start the Development Server
```bash
npx expo start
```

### 4. Run the App

- **iOS**: Press `i` in the terminal or scan QR with iOS Camera app
- **Android**: Press `a` in the terminal or scan QR with Expo Go app
- **Web**: Press `w` to open in browser

## Project Structure

```
PTApp/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts (Auth, etc.)
│   ├── lib/                # Utilities and external services
│   ├── screens/            # App screens
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Helper functions
├── assets/                 # Images, icons, etc.
├── App.tsx                 # Main app component
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── supabase-schema.sql    # Database schema
└── .env                   # Environment variables (create from .env.example)
```

## Data Models

The app includes comprehensive data models for:

- **Users & Authentication**: Roles, profiles, client details
- **Credits System**: Balances, transactions, purchase history
- **Booking**: Slots, bookings, cancellations
- **Workouts**: Exercises, programmes, logging, sets
- **Business**: Pricing, payments, referrals

## Testing the App

1. **Create Test Accounts**
   - Open the app and click "Don't have an account? Sign Up"
   - Create a client account (default role)
   - Create an admin account (you'll need to manually set role in Supabase)

2. **Set Admin Role**
   - In Supabase dashboard, go to Table Editor
   - Open the `profiles` table
   - Find your admin user and set `role` to 'admin'

3. **Test Features**
   - Login as client: See dashboard, credits, quick actions
   - Login as admin: Access admin portal (coming in Phase 7)

## Development Notes

- **Authentication**: Uses Supabase Auth with automatic profile creation
- **Database**: PostgreSQL with Row Level Security (RLS)
- **State Management**: React Context for authentication
- **Navigation**: React Navigation with stack + tab navigators
- **Styling**: StyleSheet with consistent design system

## Deployment

### iOS App Store
1. Build with Expo Application Services (EAS)
2. Create Apple Developer account ($99/year)
3. Follow EAS Build and Submit documentation

### Google Play Store
1. Build with EAS
2. Create Google Play Developer account ($25 one-time)
3. Follow EAS Build and Submit documentation

## Support

For issues or questions:
1. Check the Supabase dashboard for database issues
2. Review the logs in the Expo development server
3. Ensure all environment variables are set correctly

## Next Steps

Ready to continue with Phase 2? The foundation is set up and ready for:
- Enhanced client profiles
- Credits purchase system
- Real dashboard data integration
- Payment processing setup
