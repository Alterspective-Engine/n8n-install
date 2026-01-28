# Supabase Self-Hosted Setup

Self-hosted Supabase stack for the n8n-install platform.

## Overview

Supabase provides:
- **PostgreSQL Database** with REST API access
- **Authentication** via GoTrue (email, magic link, OAuth)
- **Real-time subscriptions** (optional)
- **Studio Dashboard** for database management

## Quick Start

### 1. Generate Secrets

Before starting, generate the required secrets:

```bash
# Generate JWT secret (at least 32 characters)
openssl rand -base64 32

# Generate anon key and service role key
# Use https://supabase.com/docs/guides/self-hosting#api-keys
# Or use the supabase CLI: supabase gen keys
```

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required secrets
JWT_SECRET=your-jwt-secret-min-32-chars
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key
POSTGRES_PASSWORD=your-secure-password

# URLs (adjust for your domain)
SUPABASE_HOSTNAME=supabase.yourdomain.com
SUPABASE_PUBLIC_URL=https://supabase.yourdomain.com
API_EXTERNAL_URL=https://supabase.yourdomain.com
SITE_URL=https://yourapp.yourdomain.com
```

### 3. Start Supabase Services

```bash
docker compose --profile supabase up -d
```

### 4. Run Database Migrations

After the database is up, run your application migrations:

```bash
# Connect to supabase-db and run migrations
docker exec -i supabase-db psql -U postgres -d postgres < your-migration.sql
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Kong | 8000 | API Gateway (routes to auth/rest) |
| PostgREST | 3000 (internal) | REST API for PostgreSQL |
| GoTrue | 9999 (internal) | Authentication service |
| Studio | 3000 | Admin dashboard |
| PostgreSQL | 5432 (internal) | Database |

## API Endpoints

All endpoints go through Kong on port 8000:

| Endpoint | Service | Description |
|----------|---------|-------------|
| `/auth/v1/*` | GoTrue | Authentication (login, signup, etc.) |
| `/rest/v1/*` | PostgREST | Database REST API |

## Authentication

### Anonymous Access

Use the `ANON_KEY` in the `apikey` header:

```bash
curl -H "apikey: YOUR_ANON_KEY" \
  https://supabase.yourdomain.com/rest/v1/your_table
```

### Service Role Access

Use the `SERVICE_ROLE_KEY` for elevated privileges:

```bash
curl -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://supabase.yourdomain.com/rest/v1/your_table
```

## Client Configuration

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://supabase.yourdomain.com',
  'YOUR_ANON_KEY'
);
```

## Troubleshooting

### Check Service Health

```bash
# Check all supabase services
docker compose --profile supabase ps

# Check logs
docker logs supabase-db
docker logs kong
docker logs supabase-rest
docker logs supabase-auth
```

### Database Connection

```bash
# Connect to database
docker exec -it supabase-db psql -U postgres

# List tables
\dt

# Check roles
\du
```

### Kong Routes

```bash
# Check Kong is routing correctly
curl http://localhost:8000/health
```

## Security Notes

1. **Never expose** `SERVICE_ROLE_KEY` in frontend code
2. **Use Row Level Security (RLS)** on all tables
3. **Rotate keys** periodically
4. **Enable HTTPS** in production via Caddy

## Related Files

- `docker-compose.yml` - Service definitions
- `supabase/volumes/api/kong.yml` - Kong routing configuration
- `supabase/volumes/db/*.sql` - Database initialization scripts
- `Caddyfile` - HTTPS routing configuration
