

# Plan: Editable Contacts + AI-Powered Enrichment

## What we're building

Two features:

1. **Editable contact details** — tapping a contact in the Contacts tab opens an edit view (reusing the ReviewPage form pattern) where all fields can be modified and saved back to the database.

2. **AI-powered enrichment** — a new edge function that uses Lovable AI + web search (via Perplexity connector) to find the real LinkedIn profile URL and likely email format for a contact, based on their name, company, and job title. Results are shown as suggestions the user can accept or edit.

---

## Bug fix: links in expanded contact

Currently, clicking anywhere on the expanded contact area triggers the ContactCard's `onClick` (collapse), swallowing the link taps. The `<a>` tags for email, LinkedIn, and website need `e.stopPropagation()` to work independently.

---

## Technical details

### 1. Contact edit flow

- **New route**: `/contacts/:id/edit` → `EditContactPage`
- **EditContactPage**: fetches the contact by ID, renders the same form as ReviewPage (first name, last name, job title, company, email, LinkedIn, website, notes), with a "Save" button that calls `supabase.from("contacts").update(...)`.
- **ContactsPage change**: add an "Edit" button in the expanded contact area, navigating to `/contacts/:id/edit`.
- **Fix link clicks**: add `e.stopPropagation()` on all `<a>` tags in the expanded section so they don't collapse the card.

### 2. AI enrichment edge function

- **New edge function**: `supabase/functions/enrich-contact/index.ts`
- Uses Lovable AI (Gemini) with a prompt like: "Given [name, company, title], find the most likely LinkedIn profile URL and email address format used at [company]. Return JSON with `linkedin_url`, `email`, `confidence`."
- Auth-protected (same pattern as scan-badge), rate-limited (50/day).
- Returns suggested LinkedIn URL and email.

### 3. Enrichment UX in EditContactPage

- "🔍 Find with AI" button next to LinkedIn and Email fields.
- On click, calls the `enrich-contact` edge function.
- Shows results as suggestions below the field: "Suggested: john.doe@acme.com — [Accept] [Edit]"
- Accepting fills the field. User can still manually edit before saving.

### 4. Files to create/modify

| File | Action |
|------|--------|
| `src/pages/EditContactPage.tsx` | Create — edit form + AI enrichment UI |
| `src/pages/ContactsPage.tsx` | Modify — add Edit button, fix link clicks |
| `src/App.tsx` | Modify — add `/contacts/:id/edit` route |
| `supabase/functions/enrich-contact/index.ts` | Create — AI enrichment edge function |

### 5. Enrichment approach decision

For real web search results (finding actual LinkedIn profiles), Lovable AI alone can only guess — it doesn't have live web access. Two options:

**Option A (recommended)**: Use Lovable AI with a well-crafted prompt to generate best-guess LinkedIn URL and email format. This is what the current scan-badge function already does. It's free and works now, but results are guesses, not verified.

**Option B**: Connect the Perplexity connector for real web search. This would let the edge function search the web for the actual LinkedIn profile and company email format. More accurate but requires connecting the Perplexity service.

I'll implement Option A first (it works immediately), and the architecture will support swapping in Perplexity later if you want verified results.

