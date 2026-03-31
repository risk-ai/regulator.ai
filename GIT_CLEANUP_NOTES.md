# Git Cleanup - Database Schema Confusion
**Date:** 2026-03-30 23:12 EST

## Issue Identified:
Vienna (backend) was testing against wrong database and made commits with incorrect schema references.

**Wrong Database:** ep-flat-wildflower-an6sdkxt.c-6.us-east-1.aws.neon.tech
**Correct Database:** ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech

**Wrong Schema:** `public` (doesn't exist in production)
**Correct Schema:** `regulator` (has all production data)

## Problematic Commits:
- 070ffb9: Changed stats to use public.execution_ledger_events (doesn't exist)
- Related commits that reference public schema tables

## Resolution:
- Aiden's code (using regulator schema) is what's deployed
- Production is NOT broken (uses Aiden's queries)
- Vienna's commits are in git history but not deployed
- This file documents the confusion for future reference

## Correct Production Schema:
```
regulator.proposals (112 rows)
regulator.audit_log (337 rows)
regulator.agent_registry (8 rows)
regulator.warrants (86 rows)
```

## Lesson:
Always verify which database is in production before making schema changes.

**Status:** Documented. Aiden's code is authoritative for all queries.
