---
name: invoices
version: 1
---

# Invoice Generation

Create professional invoices in PDF or markdown format from a template and line items.

## When to use this skill

- User wants to create an invoice for a client
- User wants to generate a recurring invoice
- User asks about billing, invoicing, payment request
- User mentions "invoice", "bill the client", "send invoice"

## Prerequisites

```
which pandoc wkhtmltopdf 2>/dev/null
```

- `pandoc` — converts markdown to PDF (via LaTeX or wkhtmltopdf)
- `wkhtmltopdf` — HTML to PDF (alternative to LaTeX for simpler output)

If neither: create a clean markdown file the user can export manually.

## Procedure

### Step 1: Gather invoice details

Ask the user for (or infer from context):
- **Your info**: name/company, address, email, payment details (bank, PayPal, etc.)
- **Client info**: client name/company, address
- **Invoice number**: use a sequential numbering scheme (INV-2024-001)
- **Issue date and due date** (typically net 30 days)
- **Line items**: description, quantity, unit price
- **Tax rate** (if applicable)
- **Notes** (payment instructions, late fees, etc.)

### Step 2: Calculate totals

```python
items = [
    {"description": "Website development", "qty": 1, "unit": 5000},
    {"description": "Hosting setup", "qty": 1, "unit": 200},
    {"description": "Monthly maintenance", "qty": 3, "unit": 150},
]

subtotal = sum(item["qty"] * item["unit"] for item in items)
tax_rate = 0.20  # 20% VAT
tax = subtotal * tax_rate
total = subtotal + tax
```

### Step 3: Generate invoice markdown

Write to `invoices/INV-2024-001.md`:

```markdown
# INVOICE

**From:**
Marcus Bader
123 Main Street, Stockholm, Sweden
marcus@example.com

**To:**
Client Company Name
456 Client Street, London, UK
billing@client.com

---

| | |
|---|---|
| **Invoice #** | INV-2024-001 |
| **Issue Date** | 15 January 2024 |
| **Due Date** | 14 February 2024 |
| **Status** | Due |

---

## Services

| Description | Qty | Unit Price | Total |
|---|---|---|---|
| Website development | 1 | €5,000.00 | €5,000.00 |
| Hosting setup | 1 | €200.00 | €200.00 |
| Monthly maintenance | 3 | €150.00 | €450.00 |

---

| | |
|---|---|
| **Subtotal** | €5,650.00 |
| **VAT (20%)** | €1,130.00 |
| **Total Due** | **€6,780.00** |

---

## Payment Details

Bank: Example Bank
IBAN: SE00 0000 0000 0000 0000
BIC: EXAMPLEXX

Please reference invoice number **INV-2024-001** with your payment.

Late payments are subject to 1.5% monthly interest after due date.
```

### Step 4: Convert to PDF

With pandoc + wkhtmltopdf:
```
pandoc INV-2024-001.md -o INV-2024-001.pdf --pdf-engine=wkhtmltopdf
```

With pandoc + LaTeX (better typography):
```
pandoc INV-2024-001.md -o INV-2024-001.pdf
```

With a CSS stylesheet for better styling:
```
pandoc INV-2024-001.md -o INV-2024-001.pdf --pdf-engine=wkhtmltopdf --css=invoice.css
```

### Step 5: Track invoice

Update an invoice log file (`~/invoices/log.csv`):
```
date,invoice_no,client,amount,status,due_date
2024-01-15,INV-2024-001,Client Company,6780.00,sent,2024-02-14
```

## Output format

After creating the invoice, summarize:
```
INVOICE CREATED: INV-2024-001

Client:    Client Company Name
Amount:    €6,780.00 (incl. 20% VAT)
Due:       14 February 2024

Files:
  Markdown: ~/invoices/INV-2024-001.md
  PDF:      ~/invoices/INV-2024-001.pdf

Next steps:
• Send PDF to billing@client.com
• Log entry added to ~/invoices/log.csv
```

## Pitfalls

- Always confirm the amounts with the user before generating PDF
- Use the same invoice numbering scheme consistently — don't restart the sequence
- Keep copies of all invoices (don't overwrite)
- For international clients, be clear about currency; for EU B2B, include VAT numbers

## Verification

After generating: open/read the PDF or markdown to verify totals are correct before sending.
