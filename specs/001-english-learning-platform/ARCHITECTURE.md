# Architecture: Containerized Frontend + Backend

**Last Updated**: January 28, 2026  
**Status**: Planning Phase - Architecture Defined

## Overview

The English Learning Platform uses a **containerized microservices architecture** with separated frontend and backend services. This design enables independent scaling, deployment, and development while maintaining clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
│            Desktop / Tablet / Mobile                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              NGINX / Load Balancer / CDN                    │
│         - SSL Termination                                   │
│         - Static Asset Caching                              │
│         - Request Routing                                   │
└────────┬─────────────────────────────────────┬──────────────┘
         │                                     │
         │ /api/*                             │ /*
         │                                     │
         ▼                                     ▼
┌──────────────────────────┐      ┌────────────────────────────┐
│  BACKEND API CONTAINER   │      │  FRONTEND CONTAINER        │
│  (Express.js + TypeScript)│     │  (Next.js 14 + TypeScript) │
├──────────────────────────┤      ├────────────────────────────┤
│ Port: 4000               │      │ Port: 3000                 │
│ Image: Node 20 Alpine    │◄─────┤ Image: Node 20 Alpine      │
│                          │ API  │                            │
│ Responsibilities:        │      │ Responsibilities:          │
│ • REST API Endpoints     │      │ • Server-Side Rendering    │
│ • Business Logic         │      │ • Client-Side Routing      │
│ • Cookie Calculations    │      │ • Static Generation        │
│ • Auth Token Validation  │      │ • Component Rendering      │
│ • Supabase Proxy         │      │ • Client State Management  │
│ • Request Validation     │      │ • API Client               │
│ • Database Transactions  │      │ • UI Components            │
└────────┬─────────────────┘      └────────────────────────────┘
         │
         │ PostgreSQL Protocol
         │ HTTP REST (Auth/Storage)
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE SERVICES                        │
├─────────────────┬──────────────────┬────────────────────────┤
│  PostgreSQL 15  │  Supabase Auth   │  Supabase Storage      │
│  (Database)     │  (JWT/OAuth)     │  (File Storage)        │
├─────────────────┼──────────────────┼────────────────────────┤
│ • Users         │ • Sessions       │ • Profile Images       │
│ • Profiles      │ • JWT Tokens     │ • Class Materials      │
│ • Classes       │ • Roles          │ • Sprite Assets        │
│ • Bookings      │ • OAuth Providers│ • Uploaded Content     │
│ • Gems        │                  │                        │
│ • Transactions  │                  │                        │
└─────────────────┴──────────────────┴────────────────────────┘
```

## Service Responsibilities

### Frontend Container (Next.js 14)

**Technology**: Next.js 14+ App Router, React 18+, TypeScript 5.x  
**Container**: `node:20-alpine` + Next.js production build  
**Port**: 3000 (internal), exposed via reverse proxy

**Core Responsibilities**:
- **Server-Side Rendering (SSR)**: Dynamic pages rendered on server
- **Static Site Generation (SSG)**: Pre-rendered pages for performance
- **Client-Side Routing**: React Router with Next.js App Router
- **UI Component Rendering**: shadcn/ui + Tailwind CSS components
- **State Management**: Zustand stores for client state
- **API Communication**: HTTP client calling backend API
- **User Interactions**: Forms, animations, real-time UI updates
- **SEO Optimization**: Meta tags, structured data, sitemap

**Key Files**:
```
frontend/
├── Dockerfile                 # Multi-stage build for production
├── next.config.js            # Next.js configuration
├── package.json              # Frontend dependencies
├── app/                      # Next.js App Router pages
├── components/               # React components
├── lib/
│   ├── api-client.ts        # Backend API client
│   ├── stores/              # Zustand state stores
│   └── utils/               # Client utilities
└── public/                   # Static assets
```

**Environment Variables**:
```bash
NEXT_PUBLIC_API_URL=http://backend:4000  # Internal Docker network
NEXT_PUBLIC_WS_URL=wss://api.domain.com/realtime
NODE_ENV=production
```

### Backend API Container (Express.js)

**Technology**: Express.js, TypeScript 5.x, Node.js 20 LTS  
**Container**: `node:20-alpine` + PM2 process manager  
**Port**: 4000 (internal), exposed via reverse proxy

**Core Responsibilities**:
- **REST API Endpoints**: CRUD operations, business logic
- **Authentication**: JWT validation, session management
- **Authorization**: Role-based access control (RBAC)
- **Gems Engine**: Transaction processing, balance calculations
- **Database Access**: PostgreSQL queries via Supabase client
- **Request Validation**: Zod schemas, input sanitization
- **Business Logic**: Booking validation, payment processing
- **Error Handling**: Centralized error responses
- **Logging**: Winston structured logging
- **Caching**: Redis integration for performance

**Key Files**:
```
backend/
├── Dockerfile                # Production container image
├── package.json             # Backend dependencies
├── src/
│   ├── server.ts           # Express app entry point
│   ├── routes/             # API route definitions
│   │   ├── auth.routes.ts
│   │   ├── bookings.routes.ts
│   │   ├── gems.routes.ts
│   │   └── classes.routes.ts
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   │   ├── auth.service.ts
│   │   ├── booking.service.ts
│   │   └── gem.service.ts
│   ├── middleware/         # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── validation.ts
│   │   └── error-handler.ts
│   ├── lib/
│   │   ├── supabase.ts    # Supabase client
│   │   ├── db.ts          # Database connection
│   │   └── logger.ts      # Winston logger
│   └── test/              # API tests
└── .env                    # Environment config
```

**Environment Variables**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
DATABASE_URL=postgresql://postgres:password@db:5432/postgres
JWT_SECRET=your-jwt-secret
PORT=4000
NODE_ENV=production
REDIS_URL=redis://redis:6379
```

### Supabase Services (Managed or Self-Hosted)

**PostgreSQL 15 Database**:
- User data, bookings, classes, Cookie transactions
- Row Level Security (RLS) policies
- Database triggers for audit logs
- Connection pooling (PgBouncer)

**Supabase Auth**:
- Email/password authentication
- OAuth providers (Google, Facebook)
- JWT token generation/validation
- Session management

**Supabase Storage**:
- Profile images
- Class materials (PDFs, videos)
- Sprite assets for characters
- Public and private buckets

**Supabase Realtime** (Optional):
- WebSocket subscriptions for live updates
- Real-time notifications
- XP/Cookie balance updates

## Communication Patterns

### 1. Frontend → Backend API (Primary)

**Protocol**: HTTP/HTTPS REST  
**Authentication**: JWT Bearer Token in `Authorization` header

**Request Flow**:
```typescript
// Frontend (frontend/lib/api-client.ts)
const apiClient = {
  async getClasses() {
    const response = await fetch(`${API_URL}/api/classes`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    })
    return response.json()
  }
}
```

**API Endpoints**:
```
POST   /api/auth/login          # User login
POST   /api/auth/register       # User registration
GET    /api/auth/me             # Current user profile

GET    /api/classes             # List all classes
GET    /api/classes/:id         # Class details
POST   /api/bookings            # Create booking
GET    /api/bookings/:id        # Booking details

GET    /api/gems/balance      # Gem balance
POST   /api/gems/spend        # Spend Gems
GET    /api/gems/transactions # Transaction history
```

### 2. Backend API → Supabase

**PostgreSQL Connection**:
```typescript
// backend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
)
```

**Database Queries**:
```typescript
// backend/src/services/booking.service.ts
async createBooking(userId: string, classId: string, gemsUsed: number) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: userId,
      class_id: classId,
      gems_used: gemsUsed,
      created_at: new Date()
    })
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return data
}
```

### 3. Container-to-Container (Docker Network)

**Internal DNS Resolution**:
- Frontend can call `http://backend:4000` (Docker service name)
- No need for external URLs in development
- Automatic service discovery

**Docker Compose Network**:
```yaml
networks:
  app-network:
    driver: bridge
```

## Containerization Strategy

### Docker Compose (Development)

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000
      - NODE_ENV=development
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend
    networks:
      - app-network
    command: npm run dev

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=development
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - app-network
    command: npm run dev

  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - app-network

  # Optional: Self-hosted Supabase (or use managed service)
  # postgres:
  #   image: supabase/postgres:15
  #   environment:
  #     POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  #   ports:
  #     - "5432:5432"
  #   volumes:
  #     - postgres-data:/var/lib/postgresql/data
  #   networks:
  #     - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
```

### Frontend Dockerfile

**File**: `frontend/Dockerfile`

```dockerfile
# Multi-stage build for production optimization
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

### Backend Dockerfile

**File**: `backend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install PM2 globally for process management
RUN npm install -g pm2

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 4000

# Use PM2 for production
CMD ["pm2-runtime", "start", "dist/server.js", "--name", "api"]
```

## Deployment Strategies

### Option 1: Docker Compose (Single Server)

**Use Case**: Small-scale deployments, staging environments

```bash
# Build and start all containers
docker-compose -f docker-compose.prod.yml up -d

# Scale backend for more capacity
docker-compose up -d --scale backend=3
```

### Option 2: Kubernetes (Production)

**Use Case**: High availability, auto-scaling, multi-region

**Kubernetes Manifests**:
```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.yourdomain.com"

---
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 5
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: supabase-secrets
              key: url
```

### Option 3: Cloud Platform (AWS/GCP/Azure)

**AWS ECS/Fargate**:
- Frontend: ECS Service with ALB
- Backend: ECS Service with internal ALB
- Supabase: Managed service or RDS PostgreSQL

**GCP Cloud Run**:
- Frontend: Cloud Run service (auto-scaling)
- Backend: Cloud Run service (auto-scaling)
- Supabase: Managed or Cloud SQL

## Benefits of This Architecture

| Benefit | Description |
|---------|-------------|
| **Independent Scaling** | Scale frontend (traffic spikes) and backend (heavy processing) separately |
| **Technology Flexibility** | Can replace backend with Go/Python without touching frontend |
| **Development Speed** | Frontend and backend teams work in parallel without conflicts |
| **Deployment Independence** | Deploy backend bug fixes without rebuilding frontend |
| **Security Layer** | Backend acts as security gateway - sensitive keys never in frontend |
| **Caching Strategy** | Add Redis/Varnish between layers without code changes |
| **Testing Simplicity** | Mock backend API in frontend tests, test API independently |
| **Microservices Ready** | Easy to extract Gem Engine or Payment service into separate containers |
| **Cost Optimization** | Run fewer frontend instances (SSR) vs more backend instances (API) |
| **Zero Downtime Deploys** | Rolling updates per service with health checks |

## Development Workflow

```bash
# 1. Start all services
docker-compose up

# 2. Frontend dev server (with hot reload)
cd frontend && npm run dev

# 3. Backend dev server (with hot reload)
cd backend && npm run dev

# 4. Run tests
npm test                    # Frontend tests
cd backend && npm test      # Backend tests

# 5. Build for production
docker-compose -f docker-compose.prod.yml build

# 6. Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Security Considerations

### API Authentication Flow

```
1. User logs in via Frontend
   ↓
2. Frontend → Backend POST /api/auth/login
   ↓
3. Backend validates credentials with Supabase Auth
   ↓
4. Backend returns JWT token
   ↓
5. Frontend stores JWT in httpOnly cookie
   ↓
6. All subsequent requests include JWT
   ↓
7. Backend validates JWT on each request
```

### Environment Isolation

- **Frontend**: Only `NEXT_PUBLIC_*` variables exposed to browser
- **Backend**: All sensitive keys kept server-side
- **Secrets**: Stored in environment variables, never in code
- **CORS**: Backend configures allowed origins

## Monitoring & Observability

### Logging
- **Frontend**: Console logs, Sentry for errors
- **Backend**: Winston structured logging, log aggregation (ELK, CloudWatch)

### Metrics
- **Frontend**: Web Vitals, performance metrics
- **Backend**: Request rate, response time, error rate
- **Database**: Query performance, connection pool

### Health Checks
```typescript
// backend/src/routes/health.ts
app.get('/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection()
  res.json({
    status: 'ok',
    database: dbStatus,
    uptime: process.uptime()
  })
})
```

## Next Steps

1. **Create Project Structure**: Setup `frontend/`, `backend/`, `shared/` directories
2. **Initialize Containers**: Create Dockerfiles and docker-compose.yml
3. **Setup CI/CD**: GitHub Actions for automated builds and tests
4. **Configure Supabase**: Initialize database, auth, storage
5. **Implement Phase 0**: Complete test infrastructure (already done for frontend!)
6. **Build Foundation**: Auth system, API client, base components
7. **Iterate on Features**: Implement user stories in parallel

---

**Questions?** See [plan.md](./plan.md) for detailed implementation plan or [tasks.md](./tasks.md) for task breakdown.

