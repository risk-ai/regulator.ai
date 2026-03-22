# Phase 2C Validation Test Plan

**Status:** Ready for Manual Testing  
**Date:** 2026-03-11  
**Milestone:** First governed AI execution pipeline

---

## What Phase 2C Proves

Vienna now demonstrates the full governed execution chain:

```
Natural Language Command
  ↓
Planner (structured plan generation)
  ↓
Envelope Generation (typed actions)
  ↓
Queued Executor (with lineage)
  ↓
Action Adapters (workspace-only)
  ↓
Verification
  ↓
Artifact Creation
```

**Key achievement:** Natural language only at intake boundary. All execution after planning is structured, deterministic, auditable.

---

## Test Environment

Test files created at:
```
/test-phase2c/contract.md (926 bytes)
/test-phase2c/meeting-notes.md (501 bytes)
/test-phase2c/requirements.md (521 bytes)
```

---

## Test 1: Summarize Single File (Happy Path)

### Steps

1. Open Files Workspace in UI: `http://100.120.116.10:5174/files`
2. Navigate to `/test-phase2c`
3. Click on `contract.md` to open in editor
4. Click attachment icon to attach current file
5. Verify attachment chip shows: `contract.md`
6. Type command: `Summarize this file`
7. Click Execute

### Expected Behavior

**Command submission:**
- Success message appears
- Objective ID returned (format: `obj_cmd_[timestamp]_[random]`)
- Message shows: "Command executed: summarize_file with 4 envelope(s)"
- Plan ID visible in response

**Envelope chain (check visualizer):**
1. `read_file` → target: `/test-phase2c/contract.md`
2. `summarize_text` → max_length: 500
3. `write_file` → target: `/test-phase2c/contract.summary.md`
4. `verify_write` → target: `/test-phase2c/contract.summary.md`

**File tree:**
- New file appears: `contract.summary.md`
- Size > 0 bytes
- Contains header: "# Summary"
- Contains timestamp
- Contains truncated content

**Visualizer:**
- 4 envelopes visible
- Parent/child lineage correct
- All envelopes show `completed` status
- No dead letters

### Validation Checklist

- [ ] Command accepted
- [ ] Objective ID returned
- [ ] Planner classified as `summarize_file`
- [ ] 4 envelopes generated
- [ ] Envelopes executed in sequence
- [ ] Summary file created
- [ ] Summary file verified
- [ ] Visualizer shows complete chain
- [ ] File tree refreshed automatically
- [ ] Output file readable

---

## Test 2: Summarize Folder (Fanout Execution)

### Steps

1. In Files Workspace, navigate to `/test-phase2c`
2. Do NOT attach individual files
3. Type command: `Summarize this folder`
4. Click Execute

### Expected Behavior

**Command submission:**
- Planner classifies as: `summarize_folder`
- Envelope count: 6 (list → 3×read → 3×summarize → aggregate → write → verify)
- Target: `/test-phase2c`

**Envelope chain:**
1. `list_directory` → target: `/test-phase2c`
2. `read_file` (fanout: true)
3. `summarize_text` (fanout: true, max_length: 200)
4. `aggregate_summaries`
5. `write_file` → target: `/test-phase2c/SUMMARY.md`
6. `verify_write` → target: `/test-phase2c/SUMMARY.md`

**Output file (`SUMMARY.md`):**
- Header: "# Folder Summary"
- Timestamp
- Total files count
- Section per file with summary
- Separators between sections

### Validation Checklist

- [ ] Command accepted with no attachment
- [ ] Planner classified as `summarize_folder`
- [ ] List directory executed first
- [ ] Fanout read operations for each file
- [ ] Fanout summarize operations
- [ ] Aggregate step combines summaries
- [ ] SUMMARY.md created
- [ ] SUMMARY.md verified
- [ ] All 3 test files included in output

---

## Test 3: Edge Case - Empty Command

### Steps

1. Type empty string or whitespace only
2. Click Execute

### Expected Behavior

- Error: "Missing or invalid required field: command"
- No objective created
- No envelopes generated

### Validation

- [ ] Rejected at route validation
- [ ] Error message clear
- [ ] No partial execution

---

## Test 4: Edge Case - No Attachment for File Summarization

### Steps

1. Do NOT attach any file
2. Type: `Summarize this file`
3. Click Execute

### Expected Behavior

- Planner classification: `summarize_file`
- Error: "summarize_file requires at least one attachment"
- Planning fails before envelope generation

### Validation

- [ ] Rejected at planning phase
- [ ] Error message clear
- [ ] Audit event shows planning failure
- [ ] No envelopes created

---

## Test 5: Edge Case - Unsupported Command

### Steps

1. Attach a file
2. Type: `Translate this to Spanish`
3. Click Execute

### Expected Behavior

- Planner classification: `unknown`
- Error: "Unsupported command type: unknown. Phase 2C supports: summarize_file, summarize_folder"
- Planning fails

### Validation

- [ ] Rejected at planning phase
- [ ] Error message shows supported types
- [ ] No envelopes created

---

## Test 6: Repeated Execution

### Steps

1. Run Test 1 successfully
2. Without changing anything, run Test 1 again
3. Verify behavior

### Expected Behavior

- Second execution succeeds
- New objective ID generated
- Summary file overwritten (or versioned if implemented)
- No corruption of first execution's audit trail

### Validation

- [ ] Both executions complete
- [ ] Separate objective IDs
- [ ] Output file reflects latest execution
- [ ] Visualizer shows both executions separately

---

## Test 7: Visualizer Inspection

For any successful execution, verify visualizer shows:

### Envelope List
- [ ] Envelope IDs visible
- [ ] Action types correct
- [ ] Target paths correct
- [ ] Status accurate (`queued` → `executing` → `completed`)
- [ ] Timestamps present

### Envelope Detail Panel
- [ ] Parent envelope ID (when applicable)
- [ ] Objective ID linkage
- [ ] Parameters visible
- [ ] Retry count (should be 0)
- [ ] Dead letter status (should be false)
- [ ] Verification result (for verify_write)

### Objective Grouping
- [ ] Envelopes grouped by objective
- [ ] Collapsible/expandable tree view
- [ ] Easy navigation between envelopes

---

## Backend API Direct Test (Optional)

If UI testing blocked, validate backend directly:

```bash
# Test command submission (requires auth cookie)
curl -X POST http://localhost:3100/api/v1/commands/submit \
  -H "Content-Type: application/json" \
  -H "Cookie: vienna_session=<session_token>" \
  -d '{
    "command": "Summarize this file",
    "attachments": ["/test-phase2c/contract.md"]
  }'

# Expected response:
{
  "success": true,
  "data": {
    "objective_id": "obj_cmd_...",
    "status": "executing",
    "command": "Summarize this file",
    "attachments": ["/test-phase2c/contract.md"],
    "message": "Command executed: summarize_file with 4 envelope(s)",
    "plan_id": "plan_...",
    "envelope_count": 4
  }
}
```

---

## Known Limitations (Phase 2C)

### Summarization Quality

**⚠️ IMPORTANT:** Phase 2C uses a **truncation stub** for summarization, not a real LLM-backed summarizer.

**Current behavior:**
- Truncates input to max_length parameter
- Adds "..." if truncated
- Adds timestamp header
- No semantic understanding
- No key point extraction

**Why this is acceptable:**
- Proves the execution pipeline works
- Tests envelope lineage
- Validates verification
- Demonstrates output artifact creation

**Before broader demos:**
- Wire in real LLM summarizer OR
- Document clearly as placeholder behavior OR
- Disable summarization commands until upgraded

**Message to stakeholders:**
> "Phase 2C validates Vienna's governed execution architecture, not summarization quality. Summary generation is currently a simple truncation stub to prove the pipeline."

---

## Success Criteria

Phase 2C validation passes if:

1. ✅ Test 1 (single file summarize) completes end-to-end
2. ✅ Test 2 (folder summarize) completes with fanout
3. ✅ Edge cases (3-5) reject cleanly with clear errors
4. ✅ Visualizer shows accurate envelope lineage
5. ✅ Output artifacts are created and verified
6. ✅ Audit trail is complete and truthful
7. ✅ Repeated execution does not corrupt state

If all pass: **Phase 2C is validated, ready for Phase 2D (batch hardening)**.

---

## Next Steps After Validation

### If validation passes:

**Phase 2D priorities:**
1. Better output naming strategy (avoid `.summary.ext` collisions)
2. Per-file failure isolation in folder summarize
3. Dead-letter visibility for failed fanout items
4. Objective summary counts in visualizer
5. Clearer output path display in result message

### If validation finds issues:

Document specific failures and root causes. Fix before proceeding to Phase 2D.

---

## Test Execution Log

### Manual Test Session: [DATE/TIME]

**Tester:** [Name]  
**Environment:** [Dev/Staging/Prod]  
**Browser:** [Chrome/Firefox/etc]

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Single file | [ ] | |
| Test 2: Folder | [ ] | |
| Test 3: Empty command | [ ] | |
| Test 4: No attachment | [ ] | |
| Test 5: Unsupported | [ ] | |
| Test 6: Repeated exec | [ ] | |
| Test 7: Visualizer | [ ] | |

**Overall Result:** [ ] PASS / [ ] FAIL

**Critical Issues Found:**

1. [Issue description]
2. [Issue description]

**Recommendations:**

1. [Recommendation]
2. [Recommendation]

---

**Phase 2C Achievement:**

This is the first point where Vienna behaves like a **real governed AI execution system**, not just a controlled editor.

The full chain works:
```
operator intent → structured planning → governed execution → verified artifact
```

That is the right architecture.
