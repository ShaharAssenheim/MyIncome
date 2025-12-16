# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-16

### Added
- 🎉 Initial release of MyIncome
- ✨ Email/Password authentication with JWT tokens
- ✨ Google OAuth 2.0 integration
- ✨ Secure CSRF protection on all endpoints
- ✨ Three income categories: Cash, Bit, Bank Transfer
- ✨ Transaction management (create, read, delete)
- ✨ Monthly income filtering and navigation
- ✨ Real-time data visualization with Recharts
- ✨ Animated UI components with Framer Motion
- ✨ Multi-user support with sharing system
- ✨ Hebrew (RTL) language interface
- ✨ Responsive design for mobile and desktop
- ✨ Skeleton loading states for better UX
- ✨ Automatic token refresh mechanism
- ✨ Rate limiting on API routes
- ✨ Supabase database integration
- ✨ Next.js 16 with App Router
- ✨ TypeScript for type safety
- ✨ Tailwind CSS for styling

### Security
- 🔒 Bcrypt password hashing
- 🔒 HttpOnly cookies for refresh tokens
- 🔒 JWT tokens with short expiration
- 🔒 Refresh token rotation
- 🔒 CSRF token validation
- 🔒 Input validation with Zod
- 🔒 Database-level user isolation
- 🔒 Secure middleware authentication

### Performance
- ⚡ Smart caching to prevent duplicate API calls
- ⚡ Optimistic UI updates
- ⚡ Client-side navigation
- ⚡ Debounced requests
- ⚡ Efficient re-render prevention

## [Unreleased]

### Planned
- [ ] Export transactions to CSV/PDF
- [ ] Budget tracking and alerts
- [ ] Recurring transaction support
- [ ] Mobile app (React Native)
- [ ] Email notifications
- [ ] Advanced analytics dashboard
- [ ] Dark mode support
- [ ] Multi-currency support
- [ ] Transaction categories customization
- [ ] Backup and restore functionality

---

## Version History

- **1.0.0** (2025-12-16) - Initial Release
