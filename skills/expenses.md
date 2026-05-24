---
name: expenses
version: 1
category: business
---

# Expense Tracking & Analysis

Track, categorize, and analyze business or personal expenses for reporting and tax purposes.

## When to use this skill

- User wants to track or log an expense
- User wants to generate an expense report
- User wants to see spending by category over a period
- User mentions "expense", "receipt", "reimbursement", "claim", "spend"

## Procedure

### Expense log format

Maintain a simple CSV at `~/expenses/expenses.csv`:
```
date,amount,currency,category,vendor,description,receipt,reimbursable
2024-01-15,42.50,EUR,Meals,Restaurang Oaxen,Client lunch with Alex,receipt-001.jpg,yes
2024-01-16,29.90,EUR,Transport,SL,Monthly transit pass,,no
2024-01-17,120.00,EUR,Software,Adobe,Creative Cloud annual,,yes
```

### Log a new expense

Append to the CSV:
```
echo "2024-01-15,42.50,EUR,Meals,Restaurang Oaxen,Client lunch,,yes" >> ~/expenses/expenses.csv
```

Or write to file with read_file + edit_file to verify format is correct.

### Generate expense report

**Summary by category:**
```python
import csv
from collections import defaultdict

with open(os.path.expanduser('~/expenses/expenses.csv')) as f:
    rows = list(csv.DictReader(f))

# Filter by date range
from_date = "2024-01-01"
to_date = "2024-01-31"
rows = [r for r in rows if from_date <= r['date'] <= to_date]

# Sum by category
by_category = defaultdict(float)
reimbursable_total = 0.0
for row in rows:
    by_category[row['category']] += float(row['amount'])
    if row.get('reimbursable', '').lower() == 'yes':
        reimbursable_total += float(row['amount'])

total = sum(by_category.values())

print(f"EXPENSE REPORT: {from_date} to {to_date}\n")
print(f"{'Category':<20} {'Amount':>10}")
print("-" * 32)
for cat, amount in sorted(by_category.items(), key=lambda x: -x[1]):
    print(f"{cat:<20} {amount:>9.2f} EUR")
print("-" * 32)
print(f"{'Total':<20} {total:>9.2f} EUR")
print(f"{'Reimbursable':<20} {reimbursable_total:>9.2f} EUR")
```

### Generate reimbursement report

Filter to reimbursable expenses only and produce a report for submission:

```python
reimbursable = [r for r in rows if r.get('reimbursable', '').lower() == 'yes']
```

Format as a table for submission to employer/client.

### Organize receipts

Store receipt images/PDFs in `~/expenses/receipts/YYYY-MM/`:
```
mkdir -p ~/expenses/receipts/2024-01/
# Move receipt file into the directory, name matching expense
```

### Tax-deductible categories

For self-employed / freelance (Swedish context):
- Software & subscriptions (100% deductible for business use)
- Client meals (75% deductible in Sweden, requires documentation of who was present)
- Home office (proportional — discuss with accountant)
- Transport to client sites (deductible)
- Professional development (courses, books) (deductible)
- Equipment (may need to be depreciated over multiple years)

Flag transactions by deductibility for easier tax filing.

## Output format

```
EXPENSE REPORT — January 2024

Category          Count    Amount
──────────────────────────────────
Software            3     €149.90
Meals               4     €187.50
Transport           5     €118.00
Equipment           1     €249.00
──────────────────────────────────
Total              13     €704.40

Reimbursable:         €436.90  ← submit to client
Non-reimbursable:     €267.50

REIMBURSABLE EXPENSES (for submission)
Date        Amount    Vendor              Description
──────────────────────────────────────────────────────
2024-01-15  €42.50   Restaurang Oaxen    Client lunch (Alex Chen)
2024-01-18  €249.00  Apple Store         External monitor for project
2024-01-22  €89.00   Adobe               CC subscription (billable)
2024-01-28  €56.40   SAS                 Flight to client (Stockholm–Malmö)
```

## Pitfalls

- Always note who was present at client meals (required for meal deduction)
- Keep digital copies of all receipts — original paper receipts must be kept for 7 years in Sweden
- Currency: record original currency AND amount (don't convert on the fly — use bank statement rate for tax purposes)
- Separate business and personal expenses — don't mix in the same account if avoidable

## Verification

After generating a report: sum the per-category totals manually and verify they match the total row.
Cross-check reimbursable total against individual reimbursable items.
