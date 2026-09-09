# 06 — Content Governance

## Absolute rule

The application and its agents **consume, display, validate, and flag** educational content. They do **not** author or “improve” it.

## Sources of truth

1. Owner-supplied JSON files (canonical educational payloads)
2. Database copies imported **verbatim** from those files
3. Administrative metadata (active, review status, flags) stored separately

PDFs in the repository are reference only — never mined into Q&A by the agent.

## Import policy

- Validate before insert
- Dry-run supported
- Transactional batches
- Idempotent via content hash
- Log errors and warnings completely
- Malformed records: reject or quarantine; **never fabricate** missing fields

## Two review concepts

### A. User study review

Private “Review later” on a question/flashcard — affects only that user’s study state.

### B. Content quality report

User flag with categories (incorrect question/answer, unclear explanation, typo, source, other) + optional comment.

Statuses: Open → Under Review → Resolved - No Change | Resolved - Source Update Required | Disabled

Flags **never** automatically change educational content.

## Product/content mismatch flag (Stage 0)

Platform brief: marine VHF. Supplied JSON: Irish HAREC amateur radio.

**Status:** Open product decision. Until marine JSON is supplied, only HAREC (or other supplied) qualifications may be published. Do not generate SRC/ROC-M/SROCP questions to fill SEO routes.
