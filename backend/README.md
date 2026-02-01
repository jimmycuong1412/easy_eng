# Backend API - Easy English Learning Platform

Modern Express.js backend API for the English learning platform with TypeScript, Supabase integration, and comprehensive testing.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ LTS
- npm or pnpm
- Supabase account

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

### Development

```bash
# Run with auto-reload
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts              # Express app entry point
│   ├── routes/                # API route definitions
│   │   ├── auth.routes.ts
│   │   ├── bookings.routes.ts
│   │   ├── gems.routes.ts
│   │   └── classes.routes.ts
│   ├── controllers/           # Request handlers
│   ├── services/              # Business logic
│   │   ├── auth.service.ts
│   │   ├── booking.service.ts
│   │   └── gem.service.ts
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── validation.ts
│   │   └── error-handler.ts
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── db.ts             # Database connection
│   │   └── logger.ts         # Winston logger
│   └── test/                 # Tests
│       ├── setup.ts
│       ├── helpers.ts
│       ├── mocks/
│       │   └── supabase.ts
│       └── fixtures/
│           ├── users.ts
│           ├── classes.ts
│           ├── bookings.ts
│           └── gem-transactions.ts
├── vitest.config.ts           # Test configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## 🧪 Testing

This project follows TDD (Test-Driven Development) with **80% coverage threshold**.

### Test Structure

- **Unit Tests**: Test individual functions and services
- **Integration Tests**: Test API endpoints with Supertest
- **Fixtures**: Pre-defined test data in `src/test/fixtures/`
- **Mocks**: Supabase client mocks in `src/test/mocks/`

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode (interactive)
npm run test:ui
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createTestRequest, expectApiSuccess } from '@/test/helpers';
import { mockSupabaseClient } from '@/test/mocks/supabase';

describe('GET /api/classes', () => {
  it('should return all published classes', async () => {
    const response = await createTestRequest(app).get('/api/classes');
    
    expectApiSuccess(response);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

## 🔧 Environment Variables

See [.env.example](.env.example) for all required environment variables.

Critical variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend only)
- `JWT_SECRET` - Secret for JWT signing
- `DATABASE_URL` - PostgreSQL connection string

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Classes
- `GET /api/classes` - List all classes
- `GET /api/classes/:id` - Get class details
- `POST /api/classes` - Create class (teacher only)
- `PATCH /api/classes/:id` - Update class (teacher only)
- `DELETE /api/classes/:id` - Delete class (teacher only)

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking

### Gems (Virtual Currency)
- `GET /api/gems/balance` - Get user's gem balance
- `GET /api/gems/transactions` - Get transaction history
- `POST /api/gems/adjust` - Adjust gems (admin only)

## 🛡️ Security

- **Row Level Security (RLS)**: All database queries respect Supabase RLS policies
- **JWT Authentication**: Token-based authentication via Supabase Auth
- **RBAC**: Role-based access control middleware
- **Input Validation**: Zod schemas for all inputs
- **Helmet**: Security headers middleware
- **CORS**: Configured for frontend origin only

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t easy-eng-backend .

# Run container
docker run -p 4000:4000 --env-file .env easy-eng-backend
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## 📊 Monitoring & Logging

- **Winston**: Structured logging with multiple transports
- **Log Levels**: error, warn, info, http, debug
- **Production**: Logs to files and external services

## 🤝 Contributing

1. Follow TDD - write tests first
2. Maintain 80%+ code coverage
3. Run `npm run lint` before committing
4. Run `npm run type-check` to ensure TypeScript correctness

## 📝 License

Private - All rights reserved
