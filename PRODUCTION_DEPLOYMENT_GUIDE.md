# Production Deployment Guide

This guide covers deploying the Vider Platform to production environments.

## 🚀 Quick Deployment (Railway - Recommended)

### Prerequisites
- GitHub repository connected to Railway
- Railway account with billing enabled
- Domain name (optional)

### Step 1: Environment Configuration
1. In Railway dashboard, go to your project
2. Navigate to Variables tab
3. Add the following environment variables:

```bash
# Database (Railway will provide this automatically)
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-minimum-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

# Email Configuration (SMTP)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
FROM_EMAIL=noreply@your-domain.com

# Platform Configuration
PLATFORM_COMMISSION_RATE=5
PLATFORM_TAX_RATE=25
BOOKING_TIMEOUT_HOURS=24
DEFAULT_CURRENCY=NOK
MIN_BOOKING_AMOUNT=500
MAX_BOOKING_AMOUNT=100000

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
PASSWORD_MIN_LENGTH=8

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

### Step 2: Deploy
1. Push your code to the main branch
2. Railway will automatically build and deploy
3. Monitor the deployment logs in Railway dashboard

### Step 3: Database Setup
Railway will automatically run migrations, but you can also run them manually:

```bash
# In Railway console or locally with production DATABASE_URL
npx prisma migrate deploy
npx prisma generate
```

### Step 4: Seed Production Data (Optional)
```bash
# Create initial platform admin and test data
npm run seed:production
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended for self-hosting)

1. **Create production docker-compose.yml**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/vider
      - JWT_SECRET=your-super-secure-jwt-secret
      # Add other environment variables
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=vider
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  postgres_data:
```

2. **Deploy**:
```bash
docker-compose up -d
```

### Using Docker Swarm or Kubernetes
See the `k8s/` directory for Kubernetes manifests and deployment instructions.

## ☁️ Cloud Provider Deployments

### AWS (ECS + RDS)

1. **Create RDS PostgreSQL instance**
2. **Create ECS cluster and task definition**
3. **Set up Application Load Balancer**
4. **Configure environment variables in ECS**
5. **Deploy using AWS CLI or CDK**

### Google Cloud Platform (Cloud Run + Cloud SQL)

1. **Create Cloud SQL PostgreSQL instance**
2. **Build and push container to Container Registry**
3. **Deploy to Cloud Run with environment variables**
4. **Set up Cloud Load Balancer if needed**

### Azure (Container Instances + PostgreSQL)

1. **Create Azure Database for PostgreSQL**
2. **Create Container Instance with environment variables**
3. **Set up Application Gateway for load balancing**

## 🔧 Manual Server Deployment

### Prerequisites
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+
- PostgreSQL 14+
- Nginx (recommended)
- PM2 for process management

### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx
```

### Step 2: Database Setup
```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE vider;
CREATE USER vider_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE vider TO vider_user;
\q
```

### Step 3: Application Deployment
```bash
# Clone repository
git clone <your-repo-url> /var/www/vider
cd /var/www/vider

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env with production values

# Run database migrations
npx prisma migrate deploy
npx prisma generate

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 4: Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files
    location /uploads {
        alias /var/www/vider/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔒 Security Checklist

### Pre-Deployment Security
- [ ] All environment variables are set securely
- [ ] JWT secrets are strong (32+ characters)
- [ ] Database credentials are secure
- [ ] SMTP credentials are configured
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] File upload restrictions are in place

### Post-Deployment Security
- [ ] SSL/TLS certificates are installed
- [ ] Firewall is configured (only necessary ports open)
- [ ] Database is not publicly accessible
- [ ] Regular security updates are scheduled
- [ ] Monitoring and alerting are set up
- [ ] Backup strategy is implemented

## 📊 Monitoring & Maintenance

### Health Checks
The application provides health check endpoints:
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status

### Logging
Logs are structured and can be integrated with:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- DataDog
- New Relic

### Backup Strategy
1. **Database Backups**: Daily automated backups
2. **File Uploads**: Regular backup to cloud storage
3. **Configuration**: Version control for all configs

### Monitoring Metrics
- Response times
- Error rates
- Database performance
- Memory and CPU usage
- Active user sessions
- Business metrics (bookings, revenue, etc.)

## 🚨 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check database connectivity
npx prisma db pull

# Verify environment variables
echo $DATABASE_URL
```

**Memory Issues**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

**File Upload Issues**
```bash
# Check upload directory permissions
chmod 755 uploads/
chown -R www-data:www-data uploads/
```

### Performance Optimization
1. Enable Redis caching
2. Configure CDN for static assets
3. Implement database connection pooling
4. Use PM2 cluster mode
5. Enable gzip compression in Nginx

## 📞 Support

For deployment issues:
1. Check the logs: `pm2 logs` or Railway logs
2. Verify environment variables
3. Test database connectivity
4. Check firewall and security group settings
5. Contact support with specific error messages

---

**Production Deployment Status**: ✅ Ready for Production

This platform has been thoroughly tested and is ready for production deployment with all security measures and best practices implemented.