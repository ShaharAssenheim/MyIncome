# 💰 MyIncome - Personal Income Tracker

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)

A modern, secure, and feature-rich personal income tracking application built with Next.js 16, featuring Google OAuth, real-time data visualization, and multi-user support.

[Features](#-features) • [Installation](#-installation) • [Configuration](#-configuration) • [Architecture](#-architecture) • [Security](#-security)

</div>

---

## ✨ Features

### 🔐 Authentication & Security
- **Dual Authentication**: Email/Password + Google OAuth 2.0
- **JWT-based auth** with secure refresh token rotation
- **CSRF protection** on all state-changing endpoints
- **HttpOnly cookies** for refresh tokens (XSS protection)
- **Bcrypt password hashing** with salt rounds
- **Session management** with automatic token refresh

### 📊 Income Management
- **Three income categories**: Cash, Bit (Digital), Bank Transfer
- **Transaction tracking** with amount, date, and description
- **Monthly filtering** with intuitive navigation
- **Visual trends chart** using Recharts
- **Real-time statistics** with animated cards
- **Transaction history** with delete functionality

### 👥 Multi-User Support
- **User sharing system**: Share your data with family/partners
- **Accessible users view**: See combined income from shared accounts
- **Access control**: Manage who can view your transactions
- **Database-level isolation**: Secure user data separation

### 🎨 Modern UI/UX
- **Responsive design**: Mobile-first approach with Tailwind CSS
- **Smooth animations**: Framer Motion for delightful interactions
- **RTL support**: Full Hebrew language interface
- **Loading states**: Skeleton screens for better perceived performance
- **Error handling**: User-friendly error messages

### ⚡ Performance Optimizations
- **Smart caching**: Prevents duplicate API calls
- **Optimistic updates**: Instant UI feedback
- **Client-side navigation**: Fast page transitions
- **Debounced requests**: Reduced server load
- **Middleware protection**: Route-level authentication

---

## 🚀 Installation

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**
- **Supabase account** (free tier works)
- **Google OAuth credentials** (optional, for Google login)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/myincome.git
cd myincome
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secrets (generate random strings)
JWT_ACCESS_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App URL
APP_URL=http://localhost:3000
```

4. **Set up the database**

Run the SQL scripts in order from the `db/` folder in your Supabase SQL Editor:
```bash
db/01_auth_users.sql
db/02_auth_refresh_tokens.sql
db/03_transactions.sql
db/04_user_shares.sql
db/05_accessible_users_view.sql
```

5. **Run the development server**
```bash
npm run dev
```

Visit `http://localhost:3000` 🎉

---

## ⚙️ Configuration

### Database Setup

The application uses Supabase PostgreSQL with the following schema:

#### Users Table
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

#### Transactions Table
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

#### User Shares Table
```sql
CREATE TABLE user_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, shared_with_id)
);
```

See the `db/` folder for complete SQL scripts with indexes and views.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
6. Copy the Client ID and Client Secret to `.env.local`

For detailed instructions, see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (never expose to client) |
| `JWT_ACCESS_SECRET` | ✅ | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth client secret (optional) |
| `APP_URL` | ✅ | Full URL of your application |

---

## 🏗️ Architecture

### Project Structure

```
myincome/
├── app/                          # Next.js 16 App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── login/           # Email/password login
│   │   │   ├── register/        # User registration
│   │   │   ├── logout/          # Logout endpoint
│   │   │   ├── refresh/         # Token refresh
│   │   │   └── google/          # Google OAuth flow
│   │   ├── transactions/        # Transaction CRUD
│   │   ├── shares/              # User sharing
│   │   └── users/               # User management
│   ├── login/                   # Login page
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main dashboard
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   ├── CategoryCard.tsx         # Income category display
│   ├── MonthSelector.tsx        # Month navigation
│   ├── ShareManagement.tsx      # User sharing UI
│   ├── SummaryCard.tsx          # Monthly summary
│   ├── TransactionList.tsx      # Transaction table
│   ├── TransactionModal.tsx     # Add transaction modal
│   └── TrendsChart.tsx          # Income trends chart
│
├── lib/                         # Utility libraries
│   ├── auth/                    # Authentication logic
│   │   ├── db.supabase.ts      # Auth database operations
│   │   ├── hash.ts             # Password hashing
│   │   ├── jwt.ts              # JWT token management
│   │   └── useAuth.ts          # Auth React hook
│   └── security/                # Security utilities
│       └── csrf.ts             # CSRF token management
│
├── db/                          # Database schemas
│   ├── 01_auth_users.sql
│   ├── 02_auth_refresh_tokens.sql
│   ├── 03_transactions.sql
│   ├── 04_user_shares.sql
│   └── 05_accessible_users_view.sql
│
├── middleware.ts                # Next.js middleware (auth)
├── supabaseServer.ts           # Supabase client
├── types.ts                    # TypeScript types
└── constants.tsx               # App constants
```

### Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Login (email/password or Google)
       ▼
┌─────────────────┐
│  /api/auth/*    │
│  Route Handler  │
└────────┬────────┘
         │ 2. Validate credentials
         │ 3. Generate JWT tokens
         ▼
┌─────────────────┐
│   Supabase DB   │
│  Store refresh  │
│     token       │
└────────┬────────┘
         │ 4. Return access token + set cookie
         ▼
┌─────────────────┐
│     Client      │
│  Store token    │
│   in memory     │
└────────┬────────┘
         │ 5. Authenticated requests
         ▼
┌─────────────────┐
│   Middleware    │
│  Verify token   │
└─────────────────┘
```

### Data Flow

1. **Authentication**: JWT tokens with refresh rotation
2. **API Calls**: Bearer token in Authorization header
3. **Middleware**: Validates refresh token cookie for pages
4. **CSRF Protection**: Required for state-changing operations
5. **Database**: Row-level security with user isolation

---

## 🔒 Security

### Security Features

#### 1. **Authentication Security**
- ✅ JWT tokens with short expiration (15 minutes)
- ✅ Refresh tokens with rotation (7-14 days)
- ✅ HttpOnly cookies for refresh tokens
- ✅ Bcrypt password hashing (10 salt rounds)
- ✅ Google OAuth 2.0 integration

#### 2. **CSRF Protection**
- ✅ CSRF tokens for all POST/DELETE requests
- ✅ Token verification in middleware
- ✅ SameSite cookie attributes

#### 3. **API Security**
- ✅ Rate limiting on API routes
- ✅ Input validation with Zod schemas
- ✅ SQL injection protection (parameterized queries)
- ✅ User ID verification in middleware

#### 4. **Data Security**
- ✅ Database-level user isolation
- ✅ Supabase Row Level Security (RLS)
- ✅ Secure service role key usage
- ✅ Environment variable protection

### Security Best Practices

```typescript
// ✅ DO: Use environment variables
const secret = process.env.JWT_SECRET;

// ❌ DON'T: Hardcode secrets
const secret = 'my-secret-key';

// ✅ DO: Validate user ownership
const userId = req.headers.get('x-user-id');
if (transaction.user_id !== userId) throw new Error();

// ❌ DON'T: Trust client data
const userId = req.body.userId; // Never!

// ✅ DO: Use HttpOnly cookies for tokens
cookieStore.set('refresh_token', token, { httpOnly: true });

// ❌ DON'T: Store tokens in localStorage
localStorage.setItem('token', token); // XSS vulnerable!
```

---

## 📦 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable Supabase RLS policies
- [ ] Set up proper CORS headers
- [ ] Configure rate limiting
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Add monitoring (Sentry, LogRocket)
- [ ] Set up database backups

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev        # Start development server (port 3000)
npm run build      # Build for production
npm run start      # Start production server
```

### Code Style

This project uses:
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **ESM modules** for modern JavaScript

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Shahar**

Made with ❤️ using Next.js and Supabase

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Recharts](https://recharts.org/) - Charting library
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Lucide Icons](https://lucide.dev/) - Beautiful icons

---

<div align="center">

⭐ Star this repo if you find it helpful!

</div>
