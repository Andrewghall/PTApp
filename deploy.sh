#!/bin/bash

# PT App - Vercel Deployment Script
# Run this to deploy your app to Vercel

echo "🚀 Deploying PT Business App to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the project first
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Deploy to Vercel
echo "🌍 Deploying to Vercel..."
echo ""
echo "⚠️  IMPORTANT: After deployment, you MUST:"
echo "   1. Go to Vercel dashboard → Project Settings → Environment Variables"
echo "   2. Add these variables:"
echo "      - EXPO_PUBLIC_SUPABASE_URL = https://lrysavxxoxiqwfhmvazy.supabase.co"
echo "      - EXPO_PUBLIC_SUPABASE_ANON_KEY = (your key from .env file)"
echo "   3. Redeploy after adding environment variables"
echo ""
echo "Press ENTER to continue..."
read

# Deploy
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Your app should now be live at the URL shown above"
echo ""
echo "📋 Next steps:"
echo "   1. Set environment variables in Vercel dashboard (see VERCEL_DEPLOYMENT_GUIDE.md)"
echo "   2. Run database migrations in Supabase (see database-migrations.sql)"
echo "   3. Update auth trigger in Supabase (see VERCEL_DEPLOYMENT_GUIDE.md)"
echo "   4. Test signup and login"
echo ""
