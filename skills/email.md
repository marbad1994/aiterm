---
name: email
version: 1
---

# Email Handling

Read, search, compose, and send email via CLI email clients.

## When to use this skill

- User wants to check their inbox or find a specific email
- User wants to compose or reply to an email
- User asks about an email thread or conversation
- User mentions "email", "inbox", "message", "send", "reply", "mail"

## Prerequisites

Check what's available:
```
which himalaya mutt neomutt aerc msmtp 2>/dev/null
```

**himalaya** is the recommended CLI email client — lightweight, fast, works with IMAP/SMTP.
**mutt/neomutt** — powerful but requires more configuration.
**msmtp** — for sending only, pairs with any client.

If none installed, suggest: `himalaya` (`cargo install himalaya` or package manager).

For sending only, `msmtp` with `~/.msmtprc` configured is the simplest path.

## Procedure

### Check inbox (himalaya)

```
himalaya list                    # list messages in inbox
himalaya list --folder Sent      # list sent folder
himalaya search "from:alex"      # search by sender
himalaya search "subject:invoice" "since:1 week"
```

### Read a message

```
himalaya read <id>               # read message by ID
himalaya attachment download <id> <filename>
```

### Compose and send

```
himalaya write                   # interactive compose
```

Or pipe directly:
```
himalaya send <<EOF
From: user@example.com
To: recipient@example.com
Subject: Meeting tomorrow

Hi,

Can we meet tomorrow at 2pm?

Best,
Marcus
EOF
```

### Reply to a message

```
himalaya reply <id>
himalaya reply-all <id>
```

### With mutt/neomutt

For reading: launch `neomutt` interactively.
For sending: `echo "body" | neomutt -s "Subject" -a attachment.pdf -- recipient@example.com`

### With msmtp (send only)

```
msmtp recipient@example.com < message.txt
```

## Output format

When summarizing inbox:
```
INBOX — 3 unread

 1. [unread] Alex Chen — "PR review feedback" (2h ago)
 2. [unread] GitHub — "Build failed: main" (4h ago)
 3.          Client A — "Invoice received" (yesterday)
```

When summarizing a thread, extract the key points and action items.

## Pitfalls

- himalaya requires an account configured in `~/.config/himalaya/config.toml` — if not set up, prompt user to configure it first
- IMAP credentials should never be shown or logged; reference config paths only
- Large attachments: warn user before downloading
- Do NOT send emails without explicit user confirmation of the recipient, subject, and content

## Verification

After sending: confirm with `himalaya list --folder Sent` that the message appears.
