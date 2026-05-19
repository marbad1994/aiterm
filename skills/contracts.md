---
name: contracts
version: 1
---

# Contract & Legal Document Review

Systematically review contracts to identify key terms, obligations, risks, and missing clauses.

## When to use this skill

- User wants to review a contract before signing
- User wants to understand their obligations under an agreement
- User wants to spot risky or unusual clauses
- User asks about "contract", "agreement", "terms", "NDA", "SLA", "MSA", "lease", "license"

## Important disclaimer

Always communicate clearly: this is AI-assisted document review, not legal advice. For significant contracts (employment, major commercial, real estate), the user should consult a qualified attorney.

## Procedure

### Step 1: Extract and read the document

```
pdftotext contract.pdf -
```

Or read if already in text/markdown format.

### Step 2: Identify the contract type and parties

Determine:
- What type of agreement is this? (NDA, employment, SaaS, service agreement, lease, etc.)
- Who are the parties? Which one is the user?
- What is the effective date and term?

### Step 3: Extract key clauses

For every contract, find and summarize:

**Core terms:**
- **Scope of work / services** — what is being provided?
- **Payment terms** — amount, schedule, late payment penalties
- **Term and termination** — how long does it last? How can either party exit?
- **Renewal** — auto-renewal clauses (especially with notice requirements)

**Liability and risk:**
- **Limitation of liability** — is there a cap? Is it reasonable?
- **Indemnification** — who indemnifies whom? How broad is it?
- **Warranties and disclaimers** — what is and isn't guaranteed?
- **Insurance requirements** — is the user required to maintain specific coverage?

**IP and confidentiality:**
- **Intellectual property assignment** — who owns work product? Does the user retain any rights?
- **Confidentiality / NDA clauses** — how long does it last? What's covered?
- **Non-compete / non-solicitation** — are there restrictions? How broad? For how long?

**Dispute resolution:**
- **Governing law** — which jurisdiction's law applies?
- **Dispute resolution mechanism** — courts, arbitration, mediation?
- **Class action waiver** — is one present?

### Step 4: Flag red flags

Common red flags to highlight:
- Unlimited liability exposure
- Very broad IP assignment ("all inventions conceived during employment")
- Non-competes that are unusually broad in scope, geography, or duration
- Unilateral modification rights ("we can change these terms at any time")
- Automatic renewal without adequate notice period
- Unreasonably short dispute notice windows
- Unilateral arbitration clauses with provider chosen by the other party
- Indemnification covering the other party's own negligence

### Step 5: Identify missing standard clauses

Flag if any of these are absent:
- Force majeure
- Severability
- Entire agreement / merger clause
- Amendment procedure
- Notice provisions

## Output format

```
CONTRACT REVIEW: [Document name]
Type: Software Services Agreement
Parties: Company A (provider) ↔ Marcus Bader (client)
Term: 12 months from Jan 1, 2024 — auto-renews unless 30 days notice

KEY TERMS
• Payment: $2,500/month, net 30, 1.5%/month late fee
• Termination: either party with 30 days notice; immediate for breach

⚠️  ITEMS TO REVIEW

1. [CLAUSE 8.2 — IP Assignment] Assigns ALL inventions made "in connection with"
   services to Company A. Unusually broad — may capture work done outside scope.
   Suggest: narrow to work product delivered under this agreement only.

2. [CLAUSE 12 — Limitation of Liability] Cap is 1 month's fees ($2,500).
   For a 12-month engagement, this is very low. Standard is 6-12 months of fees.

3. [CLAUSE 15 — Renewal] Auto-renews with only 14-day cancellation window.
   Calendar a reminder 6 weeks before anniversary date.

✓  STANDARD CLAUSES PRESENT
   Force majeure ✓  Severability ✓  Governing law (California) ✓

RECOMMENDED NEXT STEPS
• Negotiate IP clause to limit scope to delivered work product
• Request liability cap increase to at least 6 months of fees
• Set calendar reminder for renewal window
• If contract value > $10k, consult an attorney before signing
```

## Pitfalls

- Don't summarize so heavily that critical terms are lost — quote important clauses verbatim
- Flag uncertainty: if a clause is ambiguous, say so rather than guessing its meaning
- Don't give a pass/fail verdict — provide information for the user to make an informed decision
- Definitions section matters: always check how key terms (like "Confidential Information") are defined

## Verification

After review: confirm you've addressed all major clause categories listed in Step 3.
If the document was extracted via PDF, spot-check 2-3 quoted passages against the original.
