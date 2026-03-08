# Performance Monitoring Setup

## Overview

This document guides the setup of performance monitoring dashboards for production environments.

## Option 1: Grafana + Prometheus (Recommended for Self-Hosted)

### Setup

1. **Install Prometheus**:
```bash
docker run -d --name prometheus \
  -p 9090:9090 \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

2. **Install Grafana**:
```bash
docker run -d --name=grafana \
  -p 3000:3000 \
  grafana/grafana
```

3. **Configure Prometheus** (`prometheus.yml`):
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'easy-eng-backend'
    static_configs:
      - targets: ['localhost:3001']
  
  - job_name: 'easy-eng-frontend'
    static_configs:
      - targets: ['localhost:3000']
```

4. **Import Grafana Dashboard**:
   - Navigate to http://localhost:3000
   - Login (default: admin/admin)
   - Import dashboard ID: 1860 (Node Exporter)
   - Import dashboard ID: 12230 (PostgreSQL)

### Key Metrics to Monitor

- **API Response Times**: p50, p95, p99
- **Request Rate**: req/s
- **Error Rate**: % of failed requests
- **Database Connections**: active, idle, waiting
- **Memory Usage**: heap used, heap total
- **CPU Usage**: % utilization

## Option 2: Datadog (Recommended for Cloud)

### Setup

1. **Install Datadog Agent**:
```bash
DD_API_KEY=<your-api-key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s.datadoghq.com/scripts/install_script.sh)"
```

2. **Enable APM**:
```bash
# backend/.env
DD_TRACE_ENABLED=true
DD_SERVICE=easy-eng-backend
DD_ENV=production
```

3. **Install dd-trace**:
```bash
npm install --save dd-trace
```

4. **Initialize in app**:
```javascript
// backend/src/index.ts (first line)
require('dd-trace').init();
```

### Dashboard Configuration

Create custom dashboard with:
- **Request Latency**: Avg, p95, p99 by endpoint
- **Throughput**: Requests per minute
- **Error Tracking**: Error count by type
- **Database Performance**: Query latency, connection pool
- **Web Vitals**: FCP, LCP, CLS from frontend

## Option 3: New Relic

### Setup

1. **Install New Relic Agent**:
```bash
npm install newrelic --save
```

2. **Configure** (`newrelic.js`):
```javascript
exports.config = {
  app_name: ['Easy Eng Backend'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  },
  distributed_tracing: {
    enabled: true
  }
};
```

3. **Initialize**:
```javascript
// backend/src/index.ts (first line)
require('newrelic');
```

## Critical Alerts

Configure alerts for:

1. **Response Time Alert**:
   - Trigger: p95 > 200ms for dashboard endpoints
   - Trigger: p95 > 500ms for search endpoints
   - Action: Slack/Email notification

2. **Error Rate Alert**:
   - Trigger: Error rate > 1%
   - Action: Page on-call engineer

3. **Database Connection Alert**:
   - Trigger: Available connections < 10%
   - Action: Auto-scale or alert DBA

4. **Disk Space Alert**:
   - Trigger: Disk usage > 80%
   - Action: Automated cleanup or alert

5. **Memory Leak Detection**:
   - Trigger: Memory growth > 10% per hour
   - Action: Investigation alert

## Dashboard Panels

### Backend API Dashboard

- Request latency (p50, p95, p99)
- Requests per minute
- Error rate
- Active connections
- Response size distribution

### Frontend Dashboard

- Page load time (FCP, LCP)
- Cumulative Layout Shift
- Time to Interactive
- Bundle size over time
- JavaScript errors

### Database Dashboard

- Query execution time
- Connection pool usage
- Cache hit ratio
- Slow query log
- Deadlocks/conflicts

### Business Metrics Dashboard

- Bookings per minute
- Gems earned vs spent
- Active users (daily/monthly)
- Revenue trends
- User retention

## Next Steps

1. Choose monitoring solution based on infrastructure
2. Deploy monitoring agents
3. Configure dashboards
4. Set up alerting rules
5. Test alert delivery
6. Document runbooks for common alerts

## References

- [Grafana Documentation](https://grafana.com/docs/)
- [Datadog APM](https://docs.datadoghq.com/tracing/)
- [New Relic Node.js Agent](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/)
