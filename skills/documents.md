---
name: documents
version: 1
category: files
---

# Document Analysis & Processing

Read, summarize, extract, and process PDF, Word, and other document formats.

## When to use this skill

- User wants to read or summarize a PDF, Word doc, or other document
- User wants to extract specific information from a document
- User wants to compare two versions of a document
- User mentions "PDF", "document", "report", "paper", "contract", "file"

## Prerequisites

Check available tools:
```
which pdftotext pdfinfo pandoc tesseract libreoffice 2>/dev/null
```

- `pdftotext` (poppler-utils) — extract text from PDF
- `pandoc` — convert between document formats
- `tesseract` — OCR for scanned PDFs/images
- `libreoffice` — convert Word/Excel files to text/PDF

If `pdftotext` is missing: `sudo apt install poppler-utils` or `brew install poppler`

## Procedure

### Read a PDF

```
pdftotext document.pdf -           # output to stdout
pdftotext -f 1 -l 5 document.pdf - # pages 1-5 only
pdfinfo document.pdf               # metadata: pages, title, author, size
```

For scanned PDFs (no selectable text), use OCR:
```
tesseract document.pdf output_base txt
```

### Read a Word document

Convert to text first:
```
pandoc document.docx -t plain
```

Or to markdown (preserves structure):
```
pandoc document.docx -t markdown
```

### Read spreadsheets

```
pandoc spreadsheet.xlsx -t plain
```

Or use `libreoffice --headless --convert-to csv file.xlsx`

### Summarize a long document

1. Extract the full text
2. If very long (>10k words), extract: title, table of contents, introduction, conclusion/executive summary, headings
3. Build the summary from these key sections plus any explicitly requested detail

### Compare two document versions

```
diff <(pdftotext v1.pdf -) <(pdftotext v2.pdf -)
```

For Word docs: convert both to markdown first, then diff.

### Find specific information in a document

After extracting text, search within it:
```
pdftotext document.pdf - | grep -i "search term" -A 3 -B 3
```

## Output format

**For summaries:**
```
## Document Summary: [filename]

**Type:** PDF, 24 pages
**Author:** John Smith, 2024-01-15

**Overview:** [1-2 sentence description of what the document is]

**Key Points:**
- Point 1
- Point 2
- Point 3

**Notable Details:** [anything specific the user should know]
```

**For extraction:** present the extracted information cleanly, citing the page number where found.

## Pitfalls

- Scanned PDFs require OCR — `pdftotext` returns empty or garbled output; detect this and switch to `tesseract`
- Password-protected PDFs: `pdftotext` will fail; inform user and ask them to provide an unlocked version
- Large documents: extract just the needed sections rather than the entire text to avoid context overload
- Tables in PDFs often don't extract cleanly — warn user if table data may be malformatted
- Legal documents: extract verbatim quotes for important clauses rather than paraphrasing

## Verification

After extraction: check that the text makes sense (not garbled) before proceeding with analysis.
If extracting page ranges, verify page count with `pdfinfo` first.
