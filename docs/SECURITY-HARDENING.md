# Vienna OS Security Hardening Guide

**Version:** 1.0  
**Date:** March 2026  
**Purpose:** Pre-launch security checklist and hardening procedures  
**Scope:** Production deployment preparation

---

## 🚀 Pre-Launch Security Checklist

### Authentication & Authorization
- [ ] **JWT Secret Rotation** - Generate new production JWT signing keys
- [ ] **API Key Management** - All demo/dev keys revoked
- [ ] **Password Policy** - Minimum complexity enforced (12+ chars, mixed case, numbers, symbols)
- [ ] **MFA Enforcement** - Multi-factor authentication mandatory for all operator accounts
- [ ] **Session Timeout** - Configure appropriate session expiry (4-8 hours)
- [ ] **RBAC Verification** - All roles follow principle of least privilege
- [ ] **SSO Integration** - Enterprise SSO configured and tested

### Network Security
- [ ] **TLS Configuration** - TLS 1.3 minimum, strong cipher suites only
- [ ] **CORS Policy** - Restrictive CORS configuration for production domains
- [ ] **Rate Limiting** - Production rate limits configured per service tier
- [ ] **Firewall Rules** - Only required ports open (443, 80)
- [ ] **DDoS Protection** - CloudFlare or equivalent enabled
- [ ] **IP Allowlisting** - Restrict admin access to known IP ranges
- [ ] **Certificate Management** - Automated cert renewal configured

### Data Protection
- [ ] **Database Encryption** - Encryption at rest enabled for all databases
- [ ] **Backup Encryption** - Database backups encrypted with separate keys
- [ ] **Connection Encryption** - All database connections use SSL/TLS
- [ ] **Row-Level Security** - Tenant isolation enforced at database level
- [ ] **Data Sanitization** - PII handling procedures documented
- [ ] **Retention Policies** - Automated data archival/deletion configured
- [ ] **Key Management** - Encryption keys stored in secure key vault

### Application Security
- [ ] **Dependency Audit** - Run `npm audit` and resolve all HIGH/CRITICAL issues
- [ ] **Input Validation** - JSON schema validation for all API endpoints
- [ ] **Output Encoding** - XSS prevention measures in place
- [ ] **SQL Injection Prevention** - Parameterized queries only
- [ ] **CSRF Protection** - Cross-site request forgery tokens implemented
- [ ] **Security Headers** - HSTS, CSP, X-Frame-Options configured
- [ ] **Error Handling** - No sensitive information in error messages

### Infrastructure Security
- [ ] **Container Security** - Base images scanned for vulnerabilities
- [ ] **Secrets Management** - All secrets in environment variables or vault
- [ ] **Resource Limits** - Memory/CPU limits configured to prevent DoS
- [ ] **Health Checks** - Comprehensive health monitoring enabled
- [ ] **Logging Security** - No credentials or PII in application logs
- [ ] **Monitoring Alerts** - Security incident alerting configured
- [ ] **Backup Testing** - Restore procedures tested and documented

### Compliance & Audit
- [ ] **Audit Logging** - Immutable audit trail for all governance actions
- [ ] **Log Retention** - 7-year retention for compliance logs
- [ ] **Privacy Controls** - GDPR/CCPA compliance verified
- [ ] **Data Processing Agreements** - DPAs with all third-party services
- [ ] **Incident Response Plan** - Security incident procedures documented
- [ ] **Regular Assessments** - Quarterly security review scheduled
- [ ] **Penetration Testing** - Annual pentest engagement planned

---

## 🔒 Dependency Security Audit

### Running npm audit

```bash
# Full dependency audit
npm audit

# Fix automatically resolvable issues
npm audit fix

# View detailed vulnerability information
npm audit --audit-level high

# Generate JSON report for analysis
npm audit --json > security-audit-$(date +%Y%m%d).json
```

### Critical Dependencies to Monitor

```javascript
// High-risk dependencies that require regular monitoring
const criticalDeps = [
  'jsonwebtoken',      // JWT authentication
  'bcryptjs',          // Password hashing
  'pg',                // PostgreSQL driver
  'express',           // Web framework
  'helmet',            // Security headers
  'cors',              // Cross-origin requests
  'body-parser',       // Request parsing
  'winston',           // Logging framework
];
```

### Automated Security Scanning

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1' # Weekly Monday 2AM

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level high
      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy-results.sarif'
```

---

## 🔐 Secret Rotation Procedures

### JWT Signing Keys

```bash
# Generate new JWT signing key
openssl rand -hex 64 > jwt-secret.key

# Update environment variable
export JWT_SECRET=$(cat jwt-secret.key)

# Graceful rotation (support old + new key for transition period)
export JWT_SECRET_OLD=$JWT_SECRET
export JWT_SECRET_NEW=$(openssl rand -hex 64)
```

### Database Credentials

```bash
# Rotate database password
NEW_PASSWORD=$(openssl rand -base64 32)

# Update user password in database
psql -c "ALTER USER vienna_app PASSWORD '$NEW_PASSWORD';"

# Update application configuration
export DATABASE_PASSWORD="$NEW_PASSWORD"
```

### API Keys

```javascript
// Rotate API keys with overlap period
const rotateApiKey = async (oldKey) => {
  // 1. Generate new key
  const newKey = generateApiKey();
  
  // 2. Enable both keys (24-hour overlap)
  await enableApiKey(newKey);
  
  // 3. Notify users of upcoming rotation
  await notifyKeyRotation(oldKey.tenantId, newKey.keyId);
  
  // 4. After 24 hours, disable old key
  setTimeout(() => disableApiKey(oldKey), 24 * 60 * 60 * 1000);
};
```

### Encryption Keys

```bash
# Rotate encryption keys for sensitive data
# 1. Generate new key
NEW_KEY=$(openssl rand -hex 32)

# 2. Re-encrypt data with new key
migrate-encryption --old-key=$OLD_KEY --new-key=$NEW_KEY

# 3. Update key in secure vault
vault kv put secret/vienna/encryption key=$NEW_KEY

# 4. Securely delete old key after migration
shred -vfz old-key.txt
```

---

## 🚨 Incident Response Plan Template

### Severity Classifications

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P0 - Critical** | System unavailable, data breach | 15 minutes | Immediate C-suite notification |
| **P1 - High** | Degraded performance, security vulnerability | 1 hour | Engineering manager + security team |
| **P2 - Medium** | Non-critical functionality impacted | 4 hours | Engineering team lead |
| **P3 - Low** | Minor issues, planned maintenance | 24 hours | Standard ticket queue |

### Response Procedures

#### 1. Detection and Triage (0-15 minutes)
- [ ] **Alert received** via monitoring system
- [ ] **Severity assessed** using classification matrix
- [ ] **Incident commander assigned** (on-call engineer)
- [ ] **Initial response team assembled**
- [ ] **Communication channels established** (#incident-response)

#### 2. Initial Response (15-60 minutes)
- [ ] **Immediate containment** measures implemented
- [ ] **Stakeholder notification** per escalation matrix
- [ ] **Evidence preservation** for forensic analysis
- [ ] **Status page updated** (if customer-facing impact)
- [ ] **Incident tracking** document created

#### 3. Investigation and Resolution (1-6 hours)
- [ ] **Root cause analysis** initiated
- [ ] **Fix identified and tested** in staging environment
- [ ] **Production deployment** with rollback plan
- [ ] **Functionality verification** post-deployment
- [ ] **Security assessment** if breach suspected

#### 4. Recovery and Communication (6-24 hours)
- [ ] **Service restoration** confirmed
- [ ] **Customer communication** sent if applicable
- [ ] **Internal stakeholder update** provided
- [ ] **Monitoring enhanced** to prevent recurrence
- [ ] **Documentation updated** with lessons learned

#### 5. Post-Incident Review (Within 7 days)
- [ ] **Post-mortem meeting** scheduled
- [ ] **Timeline reconstruction** completed
- [ ] **Action items identified** for prevention
- [ ] **Process improvements** documented
- [ ] **Training needs** assessed

### Communication Templates

```markdown
## Security Incident - Initial Notification

**Incident ID:** INC-20260326-001
**Severity:** P1 - High  
**Status:** Investigating
**Impact:** API rate limiting temporarily disabled
**Started:** 2026-03-26 14:30 UTC
**ETA:** Resolution within 2 hours

**Current Actions:**
- Investigating unusual traffic patterns
- Rate limiting rules temporarily relaxed
- Monitoring system performance closely

**Next Update:** 15:00 UTC
```

### Incident Response Contacts

```yaml
contacts:
  incident_commander:
    primary: "security@regulator.ai"
    backup: "+1-555-SECURITY"
  
  escalation_chain:
    engineering: "eng-team@regulator.ai"
    security: "security@regulator.ai" 
    executive: "leadership@regulator.ai"
    
  external:
    legal: "legal@company.com"
    pr: "communications@company.com"
    insurance: "cyber-insurance@carrier.com"
```

---

## 🎯 Penetration Testing Scope

### Testing Methodology
- **OWASP Top 10** - Web application security risks
- **NIST Cybersecurity Framework** - Comprehensive security assessment
- **SANS Critical Security Controls** - Implementation verification
- **Custom governance testing** - Vienna OS specific attack vectors

### In-Scope Systems
- [ ] **Production API** (https://api.regulator.ai)
- [ ] **Web Console** (https://console.regulator.ai)
- [ ] **Authentication systems** (JWT, SSO, MFA)
- [ ] **Database layer** (PostgreSQL with RLS)
- [ ] **Infrastructure** (Vercel serverless + Neon database deployment)
- [ ] **Third-party integrations** (monitoring, logging)

### Out-of-Scope Systems
- [ ] **Physical offices** (no physical penetration testing)
- [ ] **Employee devices** (personal laptops, phones)
- [ ] **Social engineering** (no phishing campaigns)
- [ ] **DoS attacks** (avoid service disruption)

### Testing Scenarios

#### 1. Authentication & Authorization Testing
```javascript
const authTests = [
  'JWT token manipulation and forgery',
  'Session fixation and hijacking',
  'Privilege escalation attempts',
  'Multi-factor authentication bypass',
  'API key enumeration and abuse',
  'RBAC boundary violations'
];
```

#### 2. Input Validation Testing
```javascript  
const inputTests = [
  'SQL injection in all parameters',
  'NoSQL injection (if applicable)',
  'Cross-site scripting (XSS)',
  'Command injection attempts',
  'File upload vulnerabilities',
  'JSON schema bypass attempts'
];
```

#### 3. Business Logic Testing
```javascript
const logicTests = [
  'Intent policy bypass attempts',
  'Warrant signature forgery',
  'Tenant isolation violations',
  'Rate limiting circumvention', 
  'Audit trail manipulation',
  'Governance rule exploitation'
];
```

#### 4. Infrastructure Testing
```javascript
const infraTests = [
  'Container escape attempts',
  'Environment variable exposure',
  'Network segmentation testing',
  'SSL/TLS configuration weaknesses',
  'Monitoring system blind spots',
  'Backup security validation'
];
```

### Testing Schedule
- **Frequency:** Annually + after major releases
- **Duration:** 2-3 weeks full assessment
- **Reporting:** Detailed findings within 1 week
- **Remediation:** 30-day response plan
- **Re-testing:** Critical/High findings within 60 days

### Vendor Selection Criteria
- [ ] **Industry certifications** (OSCP, CISSP, CEH)
- [ ] **Cloud platform expertise** (Vercel, Neon, serverless deployment experience)  
- [ ] **API security specialization** (REST, GraphQL, JWT)
- [ ] **Compliance experience** (SOC 2, ISO 27001)
- [ ] **Reference customers** in similar industries
- [ ] **Insurance coverage** (E&O, cyber liability)

---

## 📊 Security Monitoring & Metrics

### Key Security Indicators (KSIs)

```javascript
const securityMetrics = {
  authentication: {
    failed_login_rate: '< 5% daily',
    session_hijack_attempts: '0 per month',
    mfa_adoption_rate: '> 95%',
    credential_stuffing_blocks: 'tracked'
  },
  
  authorization: {
    privilege_escalation_attempts: '0 per month',
    unauthorized_access_blocks: 'tracked',
    api_key_violations: '< 10 per day',
    tenant_isolation_violations: '0 per month'
  },
  
  infrastructure: {
    vulnerability_scan_frequency: 'weekly',
    critical_patch_time: '< 24 hours',
    security_alert_response_time: '< 15 minutes',
    incident_mean_time_to_resolution: '< 4 hours'
  }
};
```

### Automated Security Tests

```bash
#!/bin/bash
# daily-security-checks.sh

echo "🔒 Running daily security validation..."

# 1. Check for weak passwords
echo "Checking password policies..."
npm run test:password-policy

# 2. Validate TLS configuration  
echo "Validating TLS configuration..."
testssl.sh --quiet https://api.regulator.ai

# 3. Check for exposed secrets
echo "Scanning for exposed secrets..."
truffleHog --regex --entropy=False .

# 4. Validate JWT configuration
echo "Testing JWT security..."
npm run test:jwt-security

# 5. Check rate limiting
echo "Validating rate limiting..."
npm run test:rate-limits

# 6. Test tenant isolation
echo "Testing tenant isolation..."
npm run test:tenant-isolation

echo "✅ Security checks completed"
```

---

## ✅ Go-Live Security Verification

### Final Security Sign-Off Checklist

#### Infrastructure Hardening
- [ ] All default passwords changed
- [ ] Unnecessary services disabled
- [ ] Security patches up to date
- [ ] Monitoring agents installed
- [ ] Backup procedures tested
- [ ] Disaster recovery validated

#### Application Security  
- [ ] All security headers implemented
- [ ] Input validation comprehensive
- [ ] Authentication mechanisms tested
- [ ] Authorization boundaries verified
- [ ] Audit logging operational
- [ ] Error handling secure

#### Operational Security
- [ ] Incident response plan activated
- [ ] Security team contacts verified
- [ ] Escalation procedures tested
- [ ] Communication templates ready
- [ ] Legal/compliance notifications prepared
- [ ] Insurance coverage confirmed

### Post-Launch Monitoring

```javascript
// Security monitoring schedule
const monitoringSchedule = {
  continuous: [
    'Authentication failures',
    'Authorization violations', 
    'Rate limit breaches',
    'Unusual traffic patterns',
    'Error rate spikes'
  ],
  
  daily: [
    'Security metric reports',
    'Vulnerability scan results',
    'Access log analysis',
    'Backup verification'
  ],
  
  weekly: [
    'Dependency updates',
    'Security patch assessment', 
    'Penetration test scheduling',
    'Compliance checklist review'
  ]
};
```

---

## 📋 Security Maintenance Schedule

### Monthly Tasks (First Monday of Month)
- [ ] **Security metrics review** - Analyze KSIs and trends
- [ ] **Vulnerability assessment** - Run comprehensive scans
- [ ] **Access review** - Verify user permissions and roles
- [ ] **Incident analysis** - Review and improve response procedures
- [ ] **Training assessment** - Security awareness for team

### Quarterly Tasks (End of Quarter)
- [ ] **Penetration testing** - Schedule external assessment
- [ ] **Policy review** - Update security policies and procedures
- [ ] **Compliance audit** - SOC 2 control verification
- [ ] **Disaster recovery test** - Full DR procedure execution
- [ ] **Third-party assessment** - Vendor security review

### Annual Tasks (Beginning of Year)
- [ ] **Security strategy review** - Update security roadmap
- [ ] **Insurance renewal** - Cyber liability coverage update
- [ ] **Compliance certification** - SOC 2 report refresh
- [ ] **Security architecture review** - System design assessment
- [ ] **Team security training** - Comprehensive training update

---

**Security is a continuous process, not a one-time checklist. Regular review and updates of these procedures are essential for maintaining a strong security posture.**

*Last updated: March 2026*
*Next review: June 2026*