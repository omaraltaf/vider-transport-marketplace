# Security Guide

This document outlines the security measures implemented in the Vider Platform and provides guidelines for maintaining security in production.

## 🔒 Security Architecture

### Authentication & Authorization

#### JWT Token Security
- **Access Tokens**: Short-lived (15 minutes) for API access
- **Refresh Tokens**: Longer-lived (7 days) for token renewal
- **Token Rotation**: Automatic refresh token rotation on use
- **Secure Storage**: HttpOnly cookies for web clients
- **Strong Secrets**: Minimum 32-character JWT secrets

#### Role-Based Access Control (RBAC)
```typescript
enum Role {
  PLATFORM_ADMIN    // Full platform access
  COMPANY_ADMIN     // Company management
  COMPANY_USER      // Standard user access
}
```

#### Password Security
- **Minimum Length**: 8 characters
- **Hashing**: bcrypt with salt rounds (12)
- **Complexity**: Enforced on frontend
- **Reset Tokens**: Secure, time-limited reset tokens
- **Account Lockout**: 5 failed attempts = 15-minute lockout

### Input Validation & Sanitization

#### Request Validation
- **Zod Schemas**: Strict TypeScript validation
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Prevention**: Input sanitization and output encoding
- **CSRF Protection**: CSRF tokens for state-changing operations

#### File Upload Security
```typescript
const ALLOWED_FILE_TYPES = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_PATH = './uploads'; // Outside web root
```

- **File Type Validation**: Whitelist approach
- **Size Limits**: Configurable per file type
- **Virus Scanning**: Integration ready for ClamAV
- **Secure Storage**: Files stored outside web root

### API Security

#### Rate Limiting
```typescript
// General API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  message: 'Too many requests'
});

// Authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // login attempts
  skipSuccessfulRequests: true
});
```

#### CORS Configuration
```typescript
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
};
```

#### Security Headers
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Database Security

#### Connection Security
- **SSL/TLS**: Enforced for all database connections
- **Connection Pooling**: Limited connection pool size
- **Credentials**: Environment variables only
- **Network**: Database not publicly accessible

#### Data Protection
- **Encryption at Rest**: Database-level encryption
- **Sensitive Data**: Additional encryption for PII
- **Audit Logging**: All data changes logged
- **Backup Encryption**: Encrypted database backups

### Infrastructure Security

#### Environment Variables
```bash
# Strong JWT secrets (minimum 32 characters)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-minimum-32-characters

# Database credentials
DATABASE_URL=postgresql://user:password@host:port/database

# Email credentials (use app passwords)
SMTP_USER=your-email@domain.com
SMTP_PASS=app-specific-password
```

#### Network Security
- **HTTPS Only**: SSL/TLS certificates required
- **Firewall**: Only necessary ports open (80, 443, 22)
- **VPN Access**: Admin access through VPN
- **DDoS Protection**: CloudFlare or similar

## 🛡️ Security Monitoring

### Audit Logging
All security-relevant events are logged:

```typescript
interface AuditLog {
  id: string;
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Json;
  reason?: string;
  ipAddress?: string;
  createdAt: Date;
}
```

### Security Events
```typescript
enum SecurityEventType {
  BRUTE_FORCE_ATTACK
  SUSPICIOUS_LOGIN
  PRIVILEGE_ESCALATION_ATTEMPT
  UNAUTHORIZED_ACCESS
  DATA_EXFILTRATION
  ANOMALOUS_BEHAVIOR
  MALICIOUS_REQUEST
  ACCOUNT_TAKEOVER_ATTEMPT
}
```

### Monitoring Alerts
- **Failed Login Attempts**: > 5 attempts from same IP
- **Privilege Escalation**: Unauthorized role changes
- **Suspicious Activity**: Unusual access patterns
- **Data Export**: Large data exports
- **API Abuse**: Rate limit violations

## 🔍 Security Testing

### Automated Security Testing
```bash
# Run security audit
npm audit

# Check for vulnerabilities
npm run security:check

# OWASP dependency check
npm run security:owasp
```

### Manual Security Testing
- **Penetration Testing**: Quarterly external testing
- **Code Review**: Security-focused code reviews
- **Vulnerability Scanning**: Regular automated scans
- **Social Engineering**: Employee security training

### Security Test Cases
```typescript
// Example security test
describe('Authentication Security', () => {
  it('should prevent brute force attacks', async () => {
    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
        .expect(401);
    }
    
    // Next attempt should be rate limited
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })
      .expect(429);
  });
});
```

## 🚨 Incident Response

### Security Incident Procedure
1. **Detection**: Automated alerts or manual discovery
2. **Assessment**: Determine severity and impact
3. **Containment**: Isolate affected systems
4. **Investigation**: Analyze logs and evidence
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security measures

### Emergency Contacts
- **Security Team**: security@vider.no
- **On-Call Engineer**: +47 XXX XX XXX
- **Legal Team**: legal@vider.no
- **External Security Firm**: [Contact Info]

### Breach Notification
- **Internal**: Immediate notification to security team
- **Customers**: Within 72 hours if personal data affected
- **Authorities**: GDPR compliance - notify within 72 hours
- **Public**: Transparent communication if widespread impact

## 🔐 Data Privacy & GDPR

### Personal Data Protection
- **Data Minimization**: Collect only necessary data
- **Purpose Limitation**: Use data only for stated purposes
- **Storage Limitation**: Automatic data deletion policies
- **Consent Management**: Clear consent mechanisms

### User Rights
- **Access**: Users can download their data
- **Rectification**: Users can correct their data
- **Erasure**: Users can request data deletion
- **Portability**: Data export in standard formats

### Data Processing
```typescript
// Example data anonymization
const anonymizeUser = (user: User) => ({
  id: user.id,
  role: user.role,
  createdAt: user.createdAt,
  // Remove PII
  email: '[REDACTED]',
  firstName: '[REDACTED]',
  lastName: '[REDACTED]',
  phone: '[REDACTED]'
});
```

## 🔧 Security Configuration

### Production Security Checklist
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Strong JWT secrets configured (32+ characters)
- [ ] Database SSL/TLS enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] File upload restrictions in place
- [ ] Audit logging enabled
- [ ] Monitoring and alerting configured
- [ ] Backup encryption enabled
- [ ] Firewall rules configured
- [ ] VPN access for admin functions
- [ ] Regular security updates scheduled

### Environment-Specific Settings

#### Development
```bash
NODE_ENV=development
ENABLE_CORS=true
LOG_LEVEL=debug
RATE_LIMIT_ENABLED=false
```

#### Production
```bash
NODE_ENV=production
ENABLE_CORS=false
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
FORCE_HTTPS=true
```

## 📚 Security Resources

### Internal Documentation
- [Security Policies](./docs/security-policies.md)
- [Incident Response Plan](./docs/incident-response.md)
- [Security Training](./docs/security-training.md)

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [GDPR Compliance Guide](https://gdpr.eu/)

### Security Tools
- **Static Analysis**: ESLint security rules
- **Dependency Scanning**: npm audit, Snyk
- **Runtime Protection**: Helmet.js
- **Monitoring**: Winston logging, Sentry error tracking

## 🔄 Security Updates

### Regular Security Tasks
- **Weekly**: Review security logs and alerts
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Security assessment and penetration testing
- **Annually**: Full security audit and policy review

### Security Metrics
- Mean Time to Detection (MTTD)
- Mean Time to Response (MTTR)
- Number of security incidents
- Vulnerability remediation time
- Security training completion rates

---

**Security Status**: ✅ Production Ready
**Last Security Review**: December 2024
**Next Review**: March 2025

For security concerns or to report vulnerabilities, contact: security@vider.no