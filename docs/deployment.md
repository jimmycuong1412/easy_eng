# Deployment Guide

**Version**: 1.0
**Last Updated**: 2026-02-03
**Platform**: Supabase + Vercel/Docker

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Supabase Configuration](#supabase-configuration)
3. [Frontend Deployment](#frontend-deployment)
4. [Backend Deployment](#backend-deployment)
5. [Docker Deployment](#docker-deployment)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Production Checklist](#production-checklist)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Environment Setup

### Prerequisites

Required software:
- **Node.js**: v18+ (LTS recommended)
- **npm** or **yarn**: Latest version
- **Git**: Latest version
- **Supabase CLI**: v1.27+
- **Docker** (optional): v20+
- **Docker Compose** (optional): v2+

### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase

# Or via npm (all platforms)
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

---

## Supabase Configuration

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in project details:
   - **Name**: `easy-eng-production` (or your preferred name)
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Pro (recommended for production)
4. Wait for project to be created (~2 minutes)

### 2. Link Local Project to Supabase

```bash
# Navigate to project directory
cd /path/to/easy_eng

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# When prompted, enter your database password
```

### 3. Push Database Migrations

```bash
# Review migrations to be applied
supabase db diff

# Push all migrations
supabase db push

# Verify tables were created
supabase db remote list
```

### 4. Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy

# Or deploy specific functions
supabase functions deploy award-lesson-gems
supabase functions deploy calculate-streak
# ... repeat for all functions
```

### 5. Set Environment Secrets

```bash
# Set secrets for Edge Functions
supabase secrets set SENDGRID_API_KEY=your_sendgrid_key
supabase secrets set COMETCHAT_APP_ID=your_cometchat_app_id
supabase secrets set COMETCHAT_API_KEY=your_cometchat_api_key
supabase secrets set COMETCHAT_REGION=your_region

# Payment gateways
supabase secrets set VNPAY_TMN_CODE=your_vnpay_code
supabase secrets set VNPAY_HASH_SECRET=your_vnpay_secret
supabase secrets set MOMO_PARTNER_CODE=your_momo_code
supabase secrets set MOMO_ACCESS_KEY=your_momo_key
supabase secrets set MOMO_SECRET_KEY=your_momo_secret
supabase secrets set ZALOPAY_APP_ID=your_zalopay_id
supabase secrets set ZALOPAY_KEY1=your_zalopay_key1
supabase secrets set ZALOPAY_KEY2=your_zalopay_key2
supabase secrets set STRIPE_SECRET_KEY=your_stripe_key
supabase secrets set STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# List all secrets (values hidden)
supabase secrets list
```

### 6. Configure Row Level Security

RLS policies are included in migrations. Verify they're active:

```sql
-- Run in Supabase SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should have `rowsecurity = true`.

### 7. Set Up Storage Buckets

```bash
# Storage buckets are created via migration 017_storage_buckets.sql
# Verify in Supabase Dashboard > Storage
```

Configure CORS for storage (in Supabase Dashboard):
- Navigate to **Storage** > **Policies**
- Add CORS policy for your frontend domain

### 8. Configure Authentication

In Supabase Dashboard > Authentication > Settings:

**Email Auth**:
- ✅ Enable email confirmation
- ✅ Enable password recovery
- Set **Site URL**: `https://your-domain.com`
- Set **Redirect URLs**:
  - `https://your-domain.com/auth/callback`
  - `http://localhost:3000/auth/callback` (for development)

**Email Templates**:
- Customize confirmation email
- Customize password reset email
- Set **From Email**: `noreply@your-domain.com`

**Security**:
- ✅ Enable CAPTCHA (recommended)
- Set **JWT expiry**: 3600 (1 hour)
- ✅ Enable MFA (optional but recommended)

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

#### Step 1: Prepare Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build to verify no errors
npm run build
```

#### Step 2: Deploy to Vercel

**Via Vercel CLI**:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Via Vercel Dashboard**:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **New Project**
3. Import Git repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### Step 3: Set Environment Variables

In Vercel Dashboard > Project > Settings > Environment Variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# CometChat
NEXT_PUBLIC_COMETCHAT_APP_ID=your-app-id
NEXT_PUBLIC_COMETCHAT_REGION=your-region
NEXT_PUBLIC_COMETCHAT_AUTH_KEY=your-auth-key

# API URL
NEXT_PUBLIC_API_URL=https://your-api-domain.com

# Environment
NEXT_PUBLIC_ENV=production
```

#### Step 4: Configure Domain

1. In Vercel Dashboard > Project > Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Enable HTTPS (automatic with Vercel)

#### Step 5: Deploy

```bash
# Trigger deployment
git push origin main
```

Vercel will automatically deploy on push to main branch.

---

### Option 2: Docker + Custom Server

See [Docker Deployment](#docker-deployment) section.

---

## Backend Deployment

### Option 1: Supabase Edge Functions (Recommended)

Edge Functions are already deployed in Supabase Configuration step.

**Monitor Functions**:
```bash
# View logs
supabase functions logs award-lesson-gems --tail

# View all function metrics in Supabase Dashboard
```

---

### Option 2: Custom Express Backend (Optional)

If deploying the Express backend separately:

#### Step 1: Prepare Backend

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build
```

#### Step 2: Deploy to Platform

**Heroku**:
```bash
heroku create easy-eng-api
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=your-url
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-key
# ... set all environment variables
git push heroku main
```

**Railway**:
```bash
railway login
railway init
railway up
```

**Google Cloud Run**:
```bash
gcloud run deploy easy-eng-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Step 3: Set Environment Variables

Copy `.env.example` to `.env` and fill in production values:

```bash
NODE_ENV=production
PORT=4000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ... all other variables from .env.example
```

---

## Docker Deployment

### Prerequisites

- Docker 20+
- Docker Compose 2+

### Step 1: Build Images

```bash
# Build all services
docker-compose build

# Or build specific service
docker-compose build frontend
docker-compose build backend
```

### Step 2: Configure Environment

Create `.env` files for each service:

**frontend/.env.production**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_COMETCHAT_APP_ID=your-app-id
NEXT_PUBLIC_COMETCHAT_REGION=your-region
NEXT_PUBLIC_COMETCHAT_AUTH_KEY=your-auth-key
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

**backend/.env.production**:
```bash
NODE_ENV=production
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# ... all other variables
```

### Step 3: Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 4: Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    env_file:
      - ./frontend/.env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "4000:4000"
    env_file:
      - ./backend/.env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci

      - name: Run tests
        run: |
          cd frontend && npm test
          cd ../backend && npm test

      - name: Build
        run: |
          cd frontend && npm run build
          cd ../backend && npm run build

  deploy-supabase:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link Supabase Project
        run: supabase link --project-ref ${{ env.SUPABASE_PROJECT_ID }}

      - name: Push database migrations
        run: supabase db push

      - name: Deploy Edge Functions
        run: supabase functions deploy

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
          vercel-args: '--prod'
```

### Required Secrets

Add these secrets in GitHub repo settings:

- `SUPABASE_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] CometChat credentials set up
- [ ] Payment gateway credentials configured
- [ ] Email service (SendGrid) configured
- [ ] Error tracking (Sentry) set up

### Database

- [ ] All migrations applied
- [ ] Row Level Security enabled on all tables
- [ ] Database backups configured
- [ ] Connection pooling configured
- [ ] Indexes optimized
- [ ] Query performance tested

### Security

- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] JWT secrets rotated
- [ ] Service role key secured
- [ ] Input validation in place
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Security headers configured

### Edge Functions

- [ ] All functions deployed
- [ ] Environment secrets set
- [ ] Function logs monitored
- [ ] Error handling tested
- [ ] Timeouts configured
- [ ] Rate limits set

### Frontend

- [ ] Production build optimized
- [ ] Images optimized
- [ ] Bundle size checked
- [ ] Performance budgets met
- [ ] SEO meta tags configured
- [ ] Analytics tracking enabled
- [ ] Error boundaries in place
- [ ] Loading states implemented

### Monitoring

- [ ] Error tracking active (Sentry)
- [ ] Log aggregation configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring set up
- [ ] Alert notifications configured
- [ ] Database monitoring active

### Integration Testing

- [ ] Payment flows tested
- [ ] Email notifications tested
- [ ] Video calls tested
- [ ] Gem transactions tested
- [ ] Booking flow tested
- [ ] Cancellation flow tested
- [ ] Referral system tested

### Documentation

- [ ] API documentation complete
- [ ] User guides published
- [ ] Deployment guide updated
- [ ] Runbook created
- [ ] Incident response plan documented

---

## Monitoring & Maintenance

### Health Checks

**Supabase**:
- Monitor in Supabase Dashboard > Reports
- Check database connections
- Monitor Edge Function invocations
- Review error rates

**Frontend**:
```bash
# Vercel health check
curl https://your-domain.com/api/health
```

**Backend**:
```bash
# Express health check
curl https://your-api-domain.com/health
```

### Logging

**Supabase Logs**:
```bash
# View Edge Function logs
supabase functions logs --tail

# View database logs
supabase logs db --tail
```

**Vercel Logs**:
- View in Vercel Dashboard > Project > Logs
- Or via CLI: `vercel logs`

### Database Backups

Supabase Pro plan includes:
- **Daily backups**: Automatic
- **Point-in-time recovery**: 7 days
- **Manual backups**: Via dashboard

Create manual backup:
```bash
# Export database
supabase db dump -f backup.sql

# Restore from backup
supabase db reset --db-url postgresql://...
```

### Scaling

**Supabase**:
- Upgrade to Pro/Team plan for higher limits
- Enable connection pooling
- Add read replicas (Enterprise)

**Vercel**:
- Automatically scales
- Monitor usage in dashboard
- Upgrade plan if needed

**Docker**:
```bash
# Scale services
docker-compose up -d --scale frontend=3 --scale backend=3
```

### Performance Optimization

1. **Database**:
   - Add indexes for slow queries
   - Enable pgBouncer connection pooling
   - Optimize expensive queries

2. **Frontend**:
   - Enable Next.js Image Optimization
   - Use Vercel Edge Network CDN
   - Implement code splitting

3. **Edge Functions**:
   - Optimize cold start times
   - Cache responses where appropriate
   - Use connection pooling

### Security Updates

**Monthly**:
- [ ] Review access logs
- [ ] Update dependencies
- [ ] Rotate API keys
- [ ] Review RLS policies
- [ ] Check for security advisories

**Quarterly**:
- [ ] Security audit
- [ ] Penetration testing
- [ ] Compliance review
- [ ] Disaster recovery drill

---

## Troubleshooting

### Common Issues

**Edge Functions not deploying**:
```bash
# Check for syntax errors
deno check supabase/functions/function-name/index.ts

# Redeploy with verbose output
supabase functions deploy function-name --debug
```

**Database connection errors**:
- Check connection pool limits
- Verify database password
- Ensure IP whitelist includes deployment servers

**CORS errors**:
- Verify allowed origins in Supabase settings
- Check Edge Function CORS headers
- Verify frontend environment variables

**Build failures**:
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Review build logs for specific errors

---

## Rollback Procedures

### Database Rollback

```bash
# List migrations
supabase migration list

# Rollback specific migration
supabase migration repair <version> --status reverted

# Verify rollback
supabase db diff
```

### Edge Function Rollback

```bash
# Deploy previous version
git checkout <previous-commit>
supabase functions deploy
git checkout main
```

### Frontend Rollback

**Vercel**:
1. Go to Vercel Dashboard > Project > Deployments
2. Find previous successful deployment
3. Click "..." menu > "Promote to Production"

---

## Support Contacts

- **Supabase Support**: support@supabase.io
- **Vercel Support**: support@vercel.com
- **CometChat Support**: support@cometchat.com
- **Payment Gateways**: Check respective documentation

---

**Last Updated**: 2026-02-03
**Next Review**: Before production launch
