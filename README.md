# 💰 MyIncome - Personal Income Tracker

A modern, secure personal income tracking application built with **Next.js 16**, **React 18**, **TypeScript**, **Supabase**, and **Tailwind CSS**. Features dual authentication (Email/Password + Google OAuth), real-time data visualization, and multi-user support.

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+
- Supabase account (free tier)
- Google OAuth credentials (optional)

### Installation

```bash
# 1. Clone and install
git clone <your-repo-url>
cd myincome
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Run the app
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local` with:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secrets (Required) - Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_ACCESS_SECRET=your-access-token-secret-32-chars-min
JWT_REFRESH_SECRET=your-refresh-token-secret-32-chars-min

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# App Settings
APP_URL=http://localhost:3000
NODE_ENV=development
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the scripts in `db/` folder in order:
   - `01_auth_users.sql` - User accounts table
   - `02_auth_refresh_tokens.sql` - Refresh tokens storage
   - `03_transactions.sql` - Transaction records
   - `04_user_shares.sql` - User sharing system
   - `05_accessible_users_view.sql` - Combined data view

### Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
6. Copy Client ID & Secret to `.env.local`

---

## ✨ Features

### 🔐 Authentication & Security
- **Email/Password + Google OAuth** authentication
- **JWT tokens** with automatic refresh (15 min access, 7-14 days refresh)
- **CSRF protection** on all state-changing operations
- **HttpOnly cookies** for refresh tokens (XSS protection)
- **Bcrypt password hashing** with 10 salt rounds
- **Rate limiting** on API endpoints
- **Input validation** with Zod schemas
- **Database user isolation** for data security

### 📊 Income Management
- **Three categories**: Cash, Bit (Digital), Bank Transfer
- **Track transactions** with amount, date, and description
- **Monthly filtering** with calendar navigation
- **Real-time statistics** with animated summary cards
- **Visual trends chart** powered by Recharts
- **Transaction history** with instant delete

### 👥 Multi-User Support
- **Share access** with family or partners
- **View combined income** from multiple shared accounts
- **Access control** - manage who can see your data
- **Database-level security** with proper isolation

### 🎨 Modern UI/UX
- **Responsive design** - works on mobile, tablet, desktop
- **RTL support** - full Hebrew language interface
- **Smooth animations** with Framer Motion
- **Skeleton loading** states for better perceived performance
- **Error handling** with user-friendly messages
- **Tailwind CSS** for beautiful, consistent styling

### ⚡ Performance
- **Smart caching** - prevents duplicate API calls
- **Optimistic updates** - instant UI feedback
- **Client-side navigation** - no full page reloads
- **Efficient re-renders** - optimized React components
- **Middleware protection** - fast route authentication

---

## 🏗️ Project Structure

```
myincome/
├── app/                      # Next.js 16 App Router
│   ├── api/                  # API Routes
│   │   ├── auth/            # Authentication endpoints
│   │   │   ├── login/       # Email/password login
│   │   │   ├── register/    # User registration
│   │   │   ├── logout/      # Logout
│   │   │   ├── refresh/     # Token refresh
│   │   │   └── google/      # Google OAuth
│   │   ├── transactions/    # Transaction CRUD
│   │   ├── shares/          # User sharing
│   │   └── users/           # User management
│   ├── login/               # Login page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Main dashboard
│   └── globals.css          # Global styles
│
├── components/              # React Components
│   ├── CategoryCard.tsx     # Income category card
│   ├── MonthSelector.tsx    # Month navigation
│   ├── ShareManagement.tsx  # User sharing UI
│   ├── SummaryCard.tsx      # Monthly summary
│   ├── TransactionList.tsx  # Transaction table
│   ├── TransactionModal.tsx # Add transaction modal
│   └── TrendsChart.tsx      # Income trends chart
│
├── lib/                     # Utilities
│   ├── auth/               # Authentication
│   │   ├── db.supabase.ts  # Auth database ops
│   │   ├── hash.ts         # Password hashing
│   │   ├── jwt.ts          # JWT management
│   │   └── useAuth.ts      # Auth React hook
│   └── security/
│       └── csrf.ts         # CSRF protection
│
├── db/                     # Database SQL Scripts
│   ├── 01_auth_users.sql
│   ├── 02_auth_refresh_tokens.sql
│   ├── 03_transactions.sql
│   ├── 04_user_shares.sql
│   └── 05_accessible_users_view.sql
│
├── middleware.ts           # Route protection
├── supabaseServer.ts      # Supabase client
├── types.ts               # TypeScript types
└── constants.tsx          # App constants
```

---

## 🔒 Security Features

### Authentication
- ✅ JWT with short expiration (15 minutes)
- ✅ Refresh token rotation (7-14 days)
- ✅ HttpOnly cookies (not accessible via JavaScript)
- ✅ Bcrypt password hashing
- ✅ Google OAuth 2.0 integration

### API Security
- ✅ CSRF tokens for POST/DELETE requests
- ✅ Rate limiting per IP
- ✅ Input validation with Zod
- ✅ SQL injection protection (parameterized queries)
- ✅ User ID verification in middleware

### Best Practices
```typescript
// ✅ DO: Use environment variables
const secret = process.env.JWT_SECRET;

// ❌ DON'T: Hardcode secrets
const secret = 'my-secret-key';

// ✅ DO: Validate user ownership
if (transaction.user_id !== req.headers.get('x-user-id')) {
  throw new Error('Unauthorized');
}

// ❌ DON'T: Trust client data
const userId = req.body.userId; // NEVER!
```

---

## 📦 Database Schema

### Users Table
```sql
CREATE TABLE auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bit', 'bank')),
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### User Shares Table
```sql
CREATE TABLE user_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, shared_with_id)
);
```

---

## 🛠️ Development

### Available Commands

```bash
npm run dev        # Start development server (port 3000)
npm run build      # Build for production
npm run start      # Start production server
```

### Tech Stack
- **Frontend**: Next.js 16, React 18, TypeScript 5.8
- **Styling**: Tailwind CSS 3.4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT (jose), bcryptjs
- **Charts**: Recharts 2.12
- **Animations**: Framer Motion 11
- **Icons**: Lucide React
- **Validation**: Zod

---

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Add all environment variables
4. Deploy!

### Production Checklist
- [ ] Strong JWT secrets (32+ characters)
- [ ] `NODE_ENV=production`
- [ ] Supabase RLS policies enabled
- [ ] HTTPS only
- [ ] Secure cookie flags
- [ ] Rate limiting configured
- [ ] Database backups enabled
- [ ] Monitoring set up (Sentry, etc.)
- [ ] Error tracking enabled

---

## 🐛 Troubleshooting

### Port 3000 in use?
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Database connection fails?
- Verify Supabase URL and key in `.env.local`
- Check all SQL scripts ran successfully
- Ensure table names match code

### Google OAuth not working?
- Verify redirect URI matches exactly
- Check Client ID and Secret are correct
- Ensure Google+ API is enabled
- Clear browser cookies and try again

### Token refresh fails?
- Clear browser cookies
- Log out and log in again (one-time fix for existing sessions)
- Verify JWT secrets are set

---

## 📚 How It Works

### Authentication Flow
```
User Login
   ↓
Validate credentials
   ↓
Generate JWT tokens (access + refresh)
   ↓
Store refresh token in database
   ↓
Return access token + set HttpOnly cookie
   ↓
User authenticated!
```

### Token Refresh
```
API call with expired token (401)
   ↓
Auto-refresh with refresh token cookie
   ↓
Get new access token
   ↓
Retry original request
```

### Data Flow
1. User adds transaction → POST /api/transactions
2. Middleware validates JWT token
3. Database stores with user_id
4. UI updates optimistically
5. Charts recalculate automatically

---

## 🎯 Future Ideas

- Export to CSV/PDF
- Budget tracking with alerts
- Recurring transactions
- Mobile app (React Native)
- Email notifications
- Advanced analytics
- Dark mode
- Multi-currency support
- Custom categories
- Receipt photo uploads

---

## 👨‍💻 Contributing

Contributions are welcome!

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

**Code Style:**
- Use TypeScript
- Follow existing patterns
- Keep components small
- Add comments for complex logic
- Test your changes

---

## 📞 Support

- Open an issue for bugs
- Start a discussion for questions
- Check existing issues before creating new ones

---

<div align="center">

**Made with ❤️ by Shahar**

⭐ Star this repo if you find it helpful!

</div>
