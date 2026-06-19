# EasyEng - Modern English Learning Platform

> 🍪 Learn English with fun! Gamification, Career Avatars, and live video classes.

## Features

- **🌐 Multi-Language Support** - Vietnamese (vi) and English (en) with locale-based routing
- **⚙️ User Preferences** - Timezone, language, and currency selection (VND/USD/EUR)
- **📹 Live Video Classes** - 1-on-1 sessions with real-time video/audio via CometChat
- **💬 Real-Time Messaging** - Chat during class sessions with optimistic updates
- **📱 Device Pre-Check** - Real camera, microphone, speaker, and network testing
- **👨‍🏫 Multi-role Dashboards** - Student, Teacher, Parent, and Admin interfaces
- **📊 Admin Dashboard** - Real data from Supabase (statistics, revenue, top teachers)
- **🍪 Cookie Rewards System** - Earn virtual currency for discounts on classes
- **🎮 Career Path Avatars** - Level up pixel-art characters as you learn
- **💳 Vietnam Payment Integration** - VNPay, MoMo, ZaloPay support (planned)
- **🌙 Dark Blue Theme** - Beautiful UI with smooth 60fps animations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x (Strict Mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Animation**: Framer Motion
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **Video**: CometChat
- **Testing**: Jest + React Testing Library + Playwright

## Getting Started

### Prerequisites

- Node.js 20.x or later
- pnpm 9.x (recommended) or npm
- Supabase account
- CometChat account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/easyeng.git
   cd easyeng/frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   # Create .env.local with your credentials
   cat > .env.local << EOF
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # CometChat
   NEXT_PUBLIC_COMETCHAT_APP_ID=167456197b8d940a5
   NEXT_PUBLIC_COMETCHAT_REGION=us
   NEXT_PUBLIC_COMETCHAT_AUTH_KEY=31c272dc8c2dec4220071992f5605e8c2bb483ab
   COMETCHAT_API_KEY=d8ec90d5e42f017d8ef65c7532b1268d01683137
   EOF
   ```

4. **Set up the database** (one-time setup):
   - Follow [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) to create all required tables in Supabase
   - Create admin user for testing
   - (Optional) Create test data

5. Run the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── [locale]/                # Locale-based routing (vi, en)
│   │   │   ├── page.tsx             # Home page
│   │   │   ├── auth/                # Auth routes (login, signup, forgot-password)
│   │   │   ├── class/
│   │   │   │   └── [classId]/
│   │   │   │       ├── pre-check/   # Device pre-check page
│   │   │   │       └── live/        # Live class with video call
│   │   │   ├── dashboard/
│   │   │   │   ├── admin/           # Admin dashboard (real Supabase data)
│   │   │   │   ├── student/         # Student dashboard
│   │   │   │   ├── teacher/         # Teacher dashboard
│   │   │   │   └── parent/          # Parent dashboard
│   │   │   ├── settings/
│   │   │   │   └── preferences/     # User preferences (language, timezone, currency)
│   │   │   └── layout.tsx           # Locale wrapper with i18n
│   │   ├── api/
│   │   │   └── cometchat/
│   │   │       └── auth-token/      # CometChat auth token generation
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── video/                   # Video call components
│   │   │   ├── CometChatVideoCall.tsx
│   │   │   ├── VideoStream.tsx
│   │   │   ├── CallControls.tsx
│   │   │   └── CallErrorBoundary.tsx
│   │   ├── common/                  # Shared components
│   │   │   └── LanguageSwitcher.tsx
│   │   └── features/                # Feature-specific components
│   ├── hooks/
│   │   ├── useCometChat.ts          # CometChat initialization
│   │   ├── useVideoCall.ts          # Video call management
│   │   ├── useCometChatMessages.ts  # Real-time messaging
│   │   ├── usePreferences.ts        # User preferences
│   │   └── ...
│   ├── stores/
│   │   └── videoCallStore.ts        # Zustand store for call state
│   ├── lib/
│   │   ├── cometchat/               # CometChat configuration
│   │   │   ├── config.ts
│   │   │   ├── client.ts
│   │   │   └── logger.ts
│   │   ├── supabase/                # Supabase client setup
│   │   └── utils.ts
│   ├── types/
│   │   ├── database.ts              # Database types
│   │   ├── cometchat.ts             # CometChat types
│   │   └── ...
│   ├── i18n/
│   │   ├── routing.ts               # Locale routing configuration
│   │   └── config.ts                # i18n config
│   └── middleware.ts                # Locale detection middleware
├── messages/
│   ├── en.json                      # English translations
│   └── vi.json                      # Vietnamese translations
├── database/
│   └── migrations/
│       ├── 001_create_profiles_table.sql
│       ├── add_currency_to_profiles.sql
│       └── create_admin_user.sql
├── public/                          # Static assets
├── tests/                           # Test files
│   ├── unit/
│   └── e2e/
├── .env.local                       # Environment variables (add required secrets)
└── tailwind.config.ts               # Tailwind configuration
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint errors |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm type-check` | Run TypeScript compiler check |

## Design System

### Colors

| Variable | Hex | Usage |
|----------|-----|-------|
| `--bg-primary` | `#0A1628` | Main background |
| `--bg-secondary` | `#1E3A5F` | Secondary background |
| `--accent-primary` | `#3B82F6` | Primary accent (blue) |
| `--accent-gold` | `#FFD700` | Level/XP indicators |
| `--accent-cookie` | `#F97316` | Cookie rewards |

### Animation Tokens

- **Duration**: instant (50ms), fast (150ms), normal (250ms), slow (400ms)
- **Easing**: ease-out-expo, spring, bounce
- **Target**: 60fps for all animations

## Implementation Status

### ✅ Completed Features

- **Phase 1**: Internationalization (i18n) with Vietnamese & English support
- **Phase 2**: User preferences management (timezone, language, currency)
- **Phase 3**: Admin dashboard with real Supabase data
- **Phase 4**: CometChat video integration (90% complete)
  - ✅ Real-time video/audio calling
  - ✅ Real-time messaging
  - ✅ Device pre-check (camera, microphone, speaker, network)
  - ✅ Call state management with Zustand
  - ✅ Error handling with boundaries
  - ⏳ Call recording (planned)
  - ⏳ Group calls (planned)

### 📚 Documentation

- **[DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md)** - Database setup instructions (profiles, bookings, cookies, teachers)
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Testing and deployment checklist
- **[FINAL_IMPLEMENTATION_SUMMARY.md](./FINAL_IMPLEMENTATION_SUMMARY.md)** - Complete feature overview
- **[COMETCHAT_IMPLEMENTATION_UPDATE.md](./COMETCHAT_IMPLEMENTATION_UPDATE.md)** - Technical CometChat details
- **[ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)** - Admin user setup instructions

## Testing

### Quick Start Testing

1. **Pre-check page**: Navigate to `/[locale]/class/[classId]/pre-check`
   - Grant camera/microphone permissions
   - Verify device checks pass
   - Click "Vào lớp học"

2. **Live class**: Navigate to `/[locale]/class/[classId]/live`
   - Video should initialize with CometChat
   - Test mic/camera toggles
   - Send test messages
   - Click end call

3. **Admin dashboard**: Navigate to `/[locale]/dashboard/admin`
   - Login with admin@easyeng.com
   - Verify real data loads from Supabase

4. **User preferences**: Navigate to `/[locale]/settings/preferences`
   - Change language, timezone, currency
   - Verify changes persist

### Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Troubleshooting

### Database Issues
- **"Table profiles not found"**: Follow [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) to create tables
- **"Permission denied"**: Check RLS policies and user roles in Supabase
- **"Foreign key constraint failed"**: Ensure tables created in correct order

### CometChat Issues
- **"Initializing video..." stuck**: Check CometChat credentials in `.env.local`
- **Camera/microphone not working**: Check browser permissions
- **Messages not appearing**: Ensure user is logged into CometChat

### i18n Issues
- **Language not changing**: Verify locale routes are `/vi/...` or `/en/...`
- **Translations missing**: Check `messages/en.json` and `messages/vi.json`

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for comprehensive troubleshooting.

## Performance

- **Code splitting**: Automatic with Next.js App Router
- **Image optimization**: With next/image
- **CSS minification**: Via Tailwind CSS
- **Video streams**: Properly cleaned up on component unmount
- **Message history**: Limited to 50 messages (prevents memory bloat)
- **Call history**: Stored in localStorage (limited to last 50 calls)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

**Note**: Screen sharing requires Chromium-based browsers (Chrome, Edge)

## Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request
5. Ensure all tests pass and code is linted

## License

Copyright © 2024 EasyEng. All rights reserved.

---

**Last Updated**: 2026-01-26
**Implementation Level**: 90% complete
**Production Ready**: 80% (needs testing and minor tweaks)
