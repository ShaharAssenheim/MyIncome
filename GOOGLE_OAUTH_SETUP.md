# Google OAuth Setup Guide

Your app is already configured to automatically use the correct URL based on the environment!

## How it works:

### Development (localhost)
- Uses `http://localhost:3000` automatically
- Set in `.env.local`: `APP_URL=http://localhost:3000`

### Production (Vercel)
- Uses your production URL
- Set in Vercel dashboard: `APP_URL=https://your-app.vercel.app`

## Setup Steps:

### 1. Google Cloud Console Setup
Go to: https://console.cloud.google.com/apis/credentials

**Add Authorized Redirect URIs:**
- Development: `http://localhost:3000/api/auth/google/callback`
- Production: `https://your-app.vercel.app/api/auth/google/callback`

### 2. Local Development (.env.local)
```env
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Production (Vercel Dashboard)
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add these variables:
   - `APP_URL` = `https://your-app.vercel.app`
   - `GOOGLE_CLIENT_ID` = your client ID
   - `GOOGLE_CLIENT_SECRET` = your client secret
   - `JWT_ACCESS_SECRET` = strong random string
   - `JWT_REFRESH_SECRET` = strong random string
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key

### 4. Redeploy
After setting environment variables in Vercel, trigger a new deployment.

## ✅ That's it!
The code automatically uses:
- `http://localhost:3000` in development
- Your production URL in production

No code changes needed!
