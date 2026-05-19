---
name: format-conversion
version: 1
---

# Document Format Conversion

Convert between document formats: markdown, PDF, Word, HTML, ePub, and more.

## When to use this skill

- User wants to convert a document to a different format
- User wants to export markdown as PDF or Word
- User wants to convert a Word doc to markdown
- User mentions "convert", "export", "PDF", "Word", "pandoc"

## Prerequisites

```
which pandoc wkhtmltopdf libreoffice imagemagick ffmpeg 2>/dev/null
```

- `pandoc` — the main tool, handles most text document conversions
- `wkhtmltopdf` — HTML/markdown to PDF (simpler output than LaTeX)
- `libreoffice --headless` — Office format conversions
- `imagemagick` (`convert`) — image format conversions
- `ffmpeg` — audio/video conversions

Install pandoc: `sudo apt install pandoc` or `brew install pandoc`

## Common Conversions

### Markdown → PDF

```
pandoc input.md -o output.pdf                          # uses LaTeX (best quality)
pandoc input.md -o output.pdf --pdf-engine=wkhtmltopdf # uses HTML (simpler, faster)
pandoc input.md -o output.pdf -V geometry:margin=2cm   # custom margins
pandoc input.md --template=custom.latex -o output.pdf  # custom template
```

For a clean PDF with a title page:
```
---
title: My Document
author: Marcus Bader
date: 2024-01-15
---
```
Add this YAML frontmatter to the markdown file.

### Markdown → Word (docx)

```
pandoc input.md -o output.docx
pandoc input.md -o output.docx --reference-doc=template.docx  # use Word template for styling
```

### Word (docx) → Markdown

```
pandoc input.docx -o output.md
pandoc input.docx -t gfm -o output.md     # GitHub Flavored Markdown
```

### Word → PDF

```
libreoffice --headless --convert-to pdf input.docx
```

### HTML → PDF

```
wkhtmltopdf input.html output.pdf
pandoc input.html -o output.pdf
```

### PDF → Text (for further processing)

```
pdftotext input.pdf output.txt
pdftotext -layout input.pdf -    # preserve layout (better for tables)
```

### Markdown → HTML

```
pandoc input.md -o output.html
pandoc input.md -s -o output.html        # standalone (with <html> wrapper)
pandoc input.md -s --css=style.css -o output.html
```

### Markdown → ePub (for e-readers)

```
pandoc input.md -o output.epub
pandoc *.md -o book.epub                 # multiple chapters into one ePub
```

### Batch conversions

Convert all markdown files in a directory to PDF:
```
for f in *.md; do pandoc "$f" -o "${f%.md}.pdf"; done
```

Convert all docx to markdown:
```
for f in *.docx; do pandoc "$f" -o "${f%.docx}.md"; done
```

### Image format conversions (imagemagick)

```
convert input.png output.jpg
convert input.jpg -quality 80 output.jpg          # reduce quality/size
convert input.png -resize 50% output.png           # resize to 50%
convert input.png -resize 800x600 output.png       # resize to max dimensions
convert *.jpg output.pdf                           # images to PDF
```

### Image to text (OCR)

```
tesseract input.png output_base txt
tesseract input.pdf output_base txt
tesseract input.png output_base -l eng+fra txt    # multiple languages
```

## Output format

After conversion:
```
CONVERSION COMPLETE

Input:   report.md (24KB, markdown)
Output:  report.pdf (156KB, PDF)
Engine:  pandoc + LaTeX
Pages:   8

File saved to: ./report.pdf
```

## Pitfalls

- LaTeX-based PDF conversion fails if LaTeX isn't installed: `sudo apt install texlive-xetex`
- Complex Word documents (tables, tracked changes) may not convert perfectly to markdown — always review output
- `wkhtmltopdf` produces simpler PDFs but handles CSS/HTML better than LaTeX
- For high-fidelity office-to-PDF, LibreOffice is more reliable than pandoc for .docx
- Image conversion with ImageMagick may be restricted by policy file — check `/etc/ImageMagick-*/policy.xml` if it fails
- OCR quality depends on image resolution — 300+ DPI recommended

## Verification

After conversion: open/read the output file and verify key sections, headings, and content are present and correctly formatted.
