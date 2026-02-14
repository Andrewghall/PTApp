#!/bin/bash

# PT App - Vercel Deployment Script with Environment Variables
# This will deploy your app to Vercel with all required environment variables

echo "🚀 Deploying PT Business App to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Load environment variables from .env
echo "📋 Loading environment variables from .env..."
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found!"
    exit 1
fi

# Build the project with environment variables
echo "📦 Building project with environment variables..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Check if project is linked
if [ ! -d .vercel ]; then
    echo "🔗 Linking to Vercel project..."
    echo ""
    echo "When prompted:"
    echo "  - Scope: andrewghall-3747s-projects"
    echo "  - Link to existing project: Y"
    echo "  - Project name: pt-app-ten"
    echo ""
    vercel link

    if [ $? -ne 0 ]; then
        echo "❌ Failed to link project"
        exit 1
    fi
fi

# Set environment variables in Vercel
echo ""
echo "🔧 Setting environment variables in Vercel..."
echo ""

# Add EXPO_PUBLIC_SUPABASE_URL
echo "$EXPO_PUBLIC_SUPABASE_URL" | vercel env add EXPO_PUBLIC_SUPABASE_URL production 2>/dev/null || echo "  (URL might already exist)"

# Add EXPO_PUBLIC_SUPABASE_ANON_KEY
echo "$EXPO_PUBLIC_SUPABASE_ANON_KEY" | vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production 2>/dev/null || echo "  (Key might already exist)"

echo ""
echo "✅ Environment variables configured"
echo ""

# Deploy to production
echo "🌍 Deploying to Vercel production..."
vercel --prod --yes

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Your app should now be live at: https://pt-app-ten.vercel.app"
echo ""
echo "📋 Next steps:"
echo "   1. ✅ Environment variables are set"
echo "   2. ⏭️  Run database migrations in Supabase (see database-migrations.sql)"
echo "   3. ⏭️  Update auth trigger in Supabase (see VERCEL_DEPLOYMENT_GUIDE.md)"
echo "   4. ⏭️  Test signup and login at https://pt-app-ten.vercel.app"
echo ""
