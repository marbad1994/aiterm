---
name: compliance
version: 1
---

# Privacy & Compliance Review

Review code and systems for GDPR, data handling, and privacy compliance issues.

## When to use this skill

- User wants to check if their code handles personal data correctly
- User wants a GDPR or privacy review of their application
- User wants to find where PII is logged or exposed
- User mentions "GDPR", "privacy", "compliance", "personal data", "PII", "CCPA"

## Important disclaimer

This is a technical review tool, not legal advice. For regulatory compliance decisions, consult a qualified privacy lawyer or DPO.

## What counts as personal data (PII)

Under GDPR, personal data includes:
- Direct identifiers: name, email, phone, IP address, user ID, username
- Indirect identifiers: location data, device ID, cookie ID, behavioral data
- Sensitive categories (higher protection): health, financial, biometric, race, religion, political views, sexual orientation
- Combined data that can identify someone when joined

## Procedure

### Step 1: Find where personal data enters the system

Search for common sources:
```
grep -r "email\|username\|phone\|address\|user_id\|userId" src/ --include="*.js" --include="*.py" -l
grep -r "req.body\|request.body\|form_data\|payload" src/ -l
grep -r "signup\|register\|login\|profile\|user\." src/ -l
```

Map: where does PII arrive? (API endpoints, form submissions, third-party webhooks)

### Step 2: Check logging for PII exposure

The most common compliance issue is logging personal data accidentally.

```
grep -rn "console.log\|logger\.\|log\.\|print(" src/ | grep -i "email\|user\|password\|token\|phone\|name"
grep -rn "logging\." src/ --include="*.py" | grep -i "request\|user\|email\|body"
```

Check structured loggers and what they include:
```
grep -rn "morgan\|winston\|pino\|structlog\|loguru" src/ -l
```

Read the logger configurations to see if request bodies are logged.

**Red flags:**
- Request body logging (may capture passwords, personal data)
- User object logging without field filtering
- Error stack traces that include user data
- Database query logging with parameter values (may contain PII)

### Step 3: Check data storage

Where is personal data stored?

```
grep -rn "INSERT INTO\|CREATE TABLE\|Schema\|model\|entity" src/ --include="*.js" --include="*.py" | grep -i "email\|user\|phone\|address"
```

Check for:
- **Passwords**: must be hashed (bcrypt, argon2, scrypt). Never MD5, SHA1, or plaintext.
  ```
  grep -rn "md5\|sha1\|sha256.*password\|bcrypt\|argon2" src/
  ```
- **Sensitive fields**: are they encrypted at rest? Check if encryption is applied.
- **Data retention**: is there code to delete user data after a period?

### Step 4: Check third-party data sharing

What external services receive personal data?

```
grep -rn "axios\|fetch\|requests\.\|http\." src/ -l | head -20
grep -rn "analytics\|mixpanel\|segment\|amplitude\|ga\.\|gtag\|intercom\|hubspot" src/ --include="*.js"
```

Review what data is sent to each external service. Under GDPR:
- User must consent to analytics/marketing data sharing
- Data processors must have a DPA (Data Processing Agreement) with you
- Data transfers outside EU require adequate safeguards

### Step 5: Check API security for personal data

```
grep -rn "router\.\|app\.\|@app.route\|@router" src/ | grep -i "user\|profile\|account"
```

For each endpoint that returns personal data:
- Is authentication required?
- Is authorization checked (users can only access their own data)?
- Are there rate limits to prevent bulk data extraction?
- Is pagination in place (not returning all users at once)?

### Step 6: Check consent and notice

Look for:
- Cookie consent implementation
- Privacy policy link
- Data collection disclosure at signup
- Opt-out mechanisms for marketing emails

### Step 7: Right to deletion / data export

Does the application support:
- Deleting a user's data on request? (GDPR Art. 17 — Right to Erasure)
- Exporting a user's data on request? (GDPR Art. 20 — Data Portability)

```
grep -rn "delete_user\|deleteAccount\|export_data\|gdpr\|erasure" src/ -l
```

## Output format

```
PRIVACY & COMPLIANCE REVIEW

CRITICAL — Fix immediately
• [src/middleware/logger.js:12] Request body logged including potentially sensitive fields.
  Request bodies may contain passwords, personal data. Log only method/path/status.

• [src/models/user.js:34] Password field appears to use SHA-256. Must use bcrypt or argon2.

HIGH — Address before next release
• [src/api/admin.js] /api/users endpoint returns all users without pagination.
  Can expose bulk PII. Add pagination and restrict to admin role only.

• No data retention policy found. GDPR requires you have a defined retention period.

MEDIUM — Plan to address
• 3 analytics integrations (Mixpanel, Google Analytics, Intercom) found.
  Verify all have user consent before data collection, and DPAs are in place.

• No user data export (right to portability) endpoint found. Implement if handling EU users.

LOOKS GOOD
• Passwords use bcrypt with salt ✓
• Authentication required on all /api/user/* endpoints ✓
• User can only access their own profile (auth check present) ✓

NOTES
This is a technical review. Have a privacy lawyer or DPO review your privacy policy,
consent flows, and data processing agreements for full GDPR compliance.
```

## Pitfalls

- GDPR applies to any service with EU users, regardless of where you're based
- "Pseudonymized" data (user IDs) is still personal data under GDPR if re-identification is possible
- Don't treat this as exhaustive — security and privacy audits by specialists are more thorough
- IP addresses are personal data under GDPR and must be handled accordingly (consent for analytics use)

## Verification

After making fixes: re-run the grep commands to confirm the specific patterns no longer appear.
Test the logging fix: trigger a request with a test email address and verify it doesn't appear in logs.
