# Database Setup

This folder contains all SQL scripts required to set up the MyIncome application database in Supabase.

## Setup Instructions

Run these SQL files **in order** in your Supabase SQL Editor:

1. **01_auth_users.sql** - Creates the users table for authentication
2. **02_auth_refresh_tokens.sql** - Creates the refresh tokens table for session management
3. **03_transactions.sql** - Creates the transactions table for income/expense records
4. **04_user_shares.sql** - Creates the sharing table for multi-user access
5. **05_accessible_users_view.sql** - Creates a view for efficient permission queries

## Tables Overview

### auth_users
Stores user account information (email, username, password hash, Google ID)

### auth_refresh_tokens
Manages user sessions with refresh tokens

### transactions
Stores all financial transactions (income and expenses) with categories and dates

### user_shares
Tracks which users have shared their data with other users

### accessible_users (view)
Helper view that returns all user IDs accessible to a given user
- Returns user's own ID
- Returns IDs of users who shared their data with them

## Quick Setup (All at Once)

You can also run all scripts together in order by copying them sequentially into the Supabase SQL Editor.

## Notes

- All tables use UUIDs for primary keys
- Foreign keys are set with CASCADE DELETE for data integrity
- Indexes are created for optimal query performance
- The `accessible_users` view enables efficient multi-user data access
