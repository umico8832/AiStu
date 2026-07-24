# Packaged knowledge snapshot

This directory contains only the runtime RAG snapshot shipped with the desktop
application. The authoritative knowledge base remains in the independent
`ods-material/knowledge_base` content domain.

Refresh and validate the snapshot from the repository root:

```bash
pnpm sync:knowledge
pnpm check:knowledge-snapshot
```

Do not add authoring drafts, review reports, prompts, or knowledge-maintenance
scripts to the desktop package.
