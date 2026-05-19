---
name: budget
version: 1
---

# Budget & Financial Analysis

Analyze income, expenses, and budgets from CSV bank exports or transaction files.

## When to use this skill

- User wants to understand their spending patterns
- User wants to categorize transactions or find anomalies
- User wants to compare actual spending vs. budget
- User asks about money, expenses, budget, cash flow, spending
- User provides a bank statement or CSV file

## Prerequisites

Transaction data in CSV format. Most banks export in one of these formats:
- Standard: `date,description,amount,balance`
- OFX/QFX (Quicken format) — convert with `ofxparse` if available

Check available tools:
```
which python3 awk bc 2>/dev/null
```

Python3 is the primary tool for CSV analysis. awk and bc for quick calculations.

## Procedure

### Read and parse transaction CSV

First, inspect the file to understand its format:
```
head -5 transactions.csv
```

Identify: date column, description/payee column, amount column. Note positive/negative conventions (expenses may be negative or there may be separate debit/credit columns).

### Summarize spending by category

Use Python to parse and group:

```python
import csv
from collections import defaultdict

# Read the file
with open('transactions.csv') as f:
    rows = list(csv.DictReader(f))

# Simple keyword-based categorization
categories = {
    'Food': ['restaurant', 'cafe', 'supermarket', 'grocery', 'uber eats', 'deliveroo'],
    'Transport': ['uber', 'lyft', 'taxi', 'fuel', 'parking', 'transit'],
    'Utilities': ['electric', 'gas', 'water', 'internet', 'phone'],
    'Shopping': ['amazon', 'ebay', 'shopify', 'zalando'],
    'Entertainment': ['netflix', 'spotify', 'cinema', 'steam'],
}

totals = defaultdict(float)
for row in rows:
    desc = row['description'].lower()
    amount = float(row['amount'].replace(',', ''))
    if amount < 0:  # expense
        category = 'Other'
        for cat, keywords in categories.items():
            if any(k in desc for k in keywords):
                category = cat
                break
        totals[category] += abs(amount)

for cat, total in sorted(totals.items(), key=lambda x: -x[1]):
    print(f"{cat:<20} ${total:>8.2f}")
```

### Find large or unusual transactions

```python
# Find transactions above threshold
threshold = 200
large = [(row['date'], row['description'], row['amount'])
         for row in rows
         if abs(float(row['amount'])) > threshold]
```

### Calculate monthly totals
```python
from collections import defaultdict
monthly = defaultdict(float)
for row in rows:
    month = row['date'][:7]  # YYYY-MM
    amount = float(row['amount'])
    if amount < 0:
        monthly[month] += abs(amount)

for month, total in sorted(monthly.items()):
    print(f"{month}: ${total:.2f}")
```

### Compare to budget

Ask the user for their budget amounts per category if not provided.
Compute variance: actual − budget. Flag categories over by >10%.

## Output format

```
SPENDING SUMMARY — January 2024
────────────────────────────────

Category          Actual    Budget    Variance
Food             $842.00   $700.00   +$142 ⚠️
Transport        $234.50   $300.00   -$65.50 ✓
Utilities        $180.00   $200.00   -$20.00 ✓
Entertainment     $67.00   $100.00   -$33.00 ✓
Shopping         $412.00   $300.00   +$112 ⚠️
Other            $156.00      —          —

Total          $1,891.50 $1,600.00   +$291.50

Notable transactions:
• $430 — IKEA (Jan 15) — largest single purchase
• $89/mo — new recurring charge from Adobe (started Jan)
```

## Pitfalls

- CSV formats vary by bank — always inspect before parsing
- Amount sign conventions differ: some use negative for expenses, others have separate debit/credit columns
- Currency formatting: strip commas and currency symbols before parsing as float
- Don't infer income from transactions without confirming with user what constitutes income vs. transfers
- Privacy: transaction data is sensitive — don't write it to any file unless user explicitly asks

## Verification

Sum all transaction amounts and verify against opening/closing balance in the statement to confirm all rows were parsed correctly.
