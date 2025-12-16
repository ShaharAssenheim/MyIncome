# Quick Setup Guide

Get MyIncome running in 5 minutes!

## 1️⃣ Prerequisites

Install:
- **Node.js 18+**: [Download here](https://nodejs.org/)
- **Git**: [Download here](https://git-scm.com/)

Create accounts:
- **Supabase**: [Sign up](https://supabase.com/) (free tier)
- **Google Cloud** (optional): [Console](https://console.cloud.google.com/)

## 2️⃣ Clone & Install

```bash
git clone <your-repo-url>
cd myincome
npm install
```

## 3️⃣ Set Up Supabase

1. Create a new project at [Supabase](https://supabase.com/)
2. Go to **Settings** → **API** and copy:
   - Project URL
   - Service Role Key (keep secret!)
3. Go to **SQL Editor** and run each file in `db/` folder in order:
   - `01_auth_users.sql`
   - `02_auth_refresh_tokens.sql`
   - `03_transactions.sql`
   - `04_user_shares.sql`
   - `05_accessible_users_view.sql`

## 4️⃣ Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_ACCESS_SECRET=generate_random_32_char_string
JWT_REFRESH_SECRET=generate_random_32_char_string
APP_URL=http://localhost:3000
```

**Generate secrets:**
```bash
# Run this twice for two different secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5️⃣ Run!

```bash
npm run dev
```

Open **http://localhost:3000** 🎉

## 🔐 Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable "Google+ API"
3. Create OAuth credentials
4. Add redirect URI: `http://localhost:3000/api/auth/google/callback`
5. Copy Client ID & Secret to `.env.local`

See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for details.

## ✅ Test

1. Register account at `/login`
2. Add a transaction
3. Navigate months
4. Share with another user
5. Test Google login (if configured)

## 🐛 Troubleshooting

**Port 3000 in use?**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

**Database errors?**
- Check Supabase URL and key
- Verify all SQL scripts ran successfully
- Check table names match code

**Google OAuth fails?**
- Verify redirect URI matches exactly
- Check credentials are correct
- Ensure Google+ API is enabled

## 📚 Next Steps

- Read the full [README.md](./README.md)
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute
- Review [CHANGELOG.md](./CHANGELOG.md) for updates

Need help? Open an issue! 🚀
