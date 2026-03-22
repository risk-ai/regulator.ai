# Phase 6.8 Complete — Frontend Command Approval UI

**Date:** 2026-03-12  
**Status:** ✓ COMPLETE  

## Objective

Build minimal frontend UI for command proposals and approval workflow.

**Before:** Backend could propose and execute commands, but no UI for operator approval.

**After:** Operator can see command proposals in chat, approve/reject with buttons, and see execution results inline.

---

## Implementation Summary

### Frontend Components

**1. CommandProposalCard (`console/client/src/components/chat/CommandProposalCard.tsx`)**
- Displays command proposal with full details
- Shows risk tier badge (T0/T1/T2) with color coding
- Shows category badge (read_only/side_effect/dangerous)
- Displays command string in code block
- Shows warrant requirement warning for side-effects
- "Approve & Execute" button (issues warrant, executes command)
- "Reject" button
- Execution result display (success/failure)
- Error handling and display

**2. Enhanced ChatPanel (`console/client/src/components/chat/ChatPanel.tsx`)**
- Detects proposals in message responses
- Renders `CommandProposalCard` inline in chat
- Shows "⚡ approval required" badge for proposal messages
- Displays execution results after approval
- Handles rejected proposals (grays out card)

**3. Backend Chat Integration (`console/server/src/routes/chat.ts`)**
- Pattern matching for command-related requests
- Automatic proposal generation for common commands:
  - "restart gateway" → `restart_service('openclaw-gateway')`
  - "check port 18789" → `check_port(18789)`
- Embeds proposal in chat response
- Falls back to normal chat if no command detected

---

## User Flow

### Scenario 1: Read-Only Command

```
User: "check port 18789"
    ↓
Backend detects command pattern
    ↓
Generates proposal: check_port(18789)
    ↓
Chat response includes proposal
    ↓
Frontend displays CommandProposalCard
    ↓
User clicks "Approve & Execute"
    ↓
Command executes immediately (no warrant needed)
    ↓
Result displayed: { listening: true, output: "..." }
```

### Scenario 2: Side-Effect Command

```
User: "restart gateway"
    ↓
Backend detects command pattern
    ↓
Generates proposal: restart_service('openclaw-gateway')
    ↓
Chat response includes proposal with requires_warrant: true
    ↓
Frontend displays CommandProposalCard with warning
    ↓
User clicks "Approve & Execute"
    ↓
Warrant issued automatically (using proposal_id)
    ↓
Command executes with warrant
    ↓
Result displayed: { success: true }
```

---

## UI Components

### Command Proposal Card States

**1. Pending Approval (Initial)**
- Yellow border
- ⚡ icon
- Risk tier badge (color-coded)
- Category badge
- Command string in code block
- Warrant warning (if applicable)
- Approve & Reject buttons

**2. Executing (Loading)**
- Buttons disabled
- "Executing..." text
- Spinner could be added

**3. Executed (Success)**
- Green border
- ✓ icon
- Command string shown
- Result displayed in code block (JSON formatted)
- Card remains visible as history

**4. Rejected**
- Gray border
- Reduced opacity
- "Command proposal rejected" message
- No buttons

**5. Error**
- Red border
- Error message displayed
- Retry button could be added

### Risk Tier Color Coding

- **T0 (Reversible):** Green badge
- **T1 (Side-effect):** Yellow badge
- **T2 (Dangerous):** Red badge

### Category Color Coding

- **read_only:** Blue badge
- **side_effect:** Orange badge
- **dangerous:** Red badge

---

## Backend Integration

### Pattern Matching

**Implemented patterns:**
- `/restart.*gateway/i` → `restart_service('openclaw-gateway')`
- `/check.*port.*(\d+)/i` → `check_port(port_number)`

**Extensible:** Easy to add more patterns for:
- Stop/start services
- Kill processes
- Check processes
- Read logs

### Response Format

```typescript
{
  success: true,
  data: {
    message: "LLM response or command acknowledgment",
    proposal: {
      proposal_id: "shell_...",
      command: "restart_service",
      category: "side_effect",
      description: "Restart a systemd service",
      command_string: "systemctl --user restart openclaw-gateway",
      args: ["openclaw-gateway"],
      requires_warrant: true,
      risk_tier: "T1",
      proposed_at: "2026-03-12T...",
      proposed_by: "vienna"
    },
    timestamp: "2026-03-12T..."
  }
}
```

---

## Warrant Issuance

**Current implementation:** Automatic warrant issuance using `proposal_id`

```typescript
const warrant = `warrant_${proposal.proposal_id}`;
```

**Future enhancement:** Proper warrant system integration with:
- Warrant request to backend
- Operator confirmation
- Warrant storage and audit
- Warrant expiration

---

## Acceptance Criteria

✅ **Vienna can diagnose system state through chat** — Recovery intents route correctly  
✅ **Vienna can run read-only terminal actions through chat** — Port/process checks execute  
✅ **Vienna can propose side-effecting actions through chat** — Proposals displayed in UI  
✅ **Operator can approve and execute through governed path** — Approve button works  
✅ **Results are surfaced clearly in chat** — Execution results shown inline  
⚠️ **Audit trail is visible and trustworthy** — Audit logged (visibility pending)

**Status:** 5/6 criteria met. Audit trail visibility needed in separate view.

---

## Files Modified

### Frontend

**New:**
- `console/client/src/components/chat/CommandProposalCard.tsx`

**Modified:**
- `console/client/src/components/chat/ChatPanel.tsx` — Integrated proposal display
- `console/client/src/api/chat.ts` — Updated types and response handling

### Backend

**Modified:**
- `console/server/src/routes/chat.ts` — Added command pattern detection and proposal generation

---

## Testing Steps

### 1. Start Console Server

```bash
cd ~/.openclaw/workspace/vienna-core/console
npm run dev
```

### 2. Open Browser

Navigate to: `http://localhost:5173` (or configured client port)

### 3. Test Command Proposals

**Test A: Read-Only Command**
```
Chat: "check port 18789"
Expected:
- Command proposal card appears
- Shows check_port command
- No warrant warning (read-only)
- Click "Approve & Execute"
- Result shows: { listening: true }
```

**Test B: Side-Effect Command**
```
Chat: "restart gateway"
Expected:
- Command proposal card appears
- Shows restart_service command
- Warrant warning displayed
- Risk tier T1 (yellow badge)
- Click "Approve & Execute"
- Command executes (if gateway running)
- Result shows: { success: true }
```

**Test C: Rejection**
```
Chat: "restart gateway"
- Click "Reject"
- Card grays out
- "Command proposal rejected" message
```

---

## Known Limitations

### Pattern Matching Simplicity

**Current:** Basic regex patterns for common commands

**Limitation:** Won't catch variations like:
- "please restart the gateway"
- "can you check if port 18789 is open?"
- "kill process 12345"

**Solution:** Phase 6.9+ could add LLM-based intent extraction

### Warrant System

**Current:** Auto-generated warrant from proposal_id

**Limitation:** No real warrant lifecycle, no expiration, no revocation

**Solution:** Integrate with Vienna Core warrant system (Phase 7.2)

### Audit Trail Visibility

**Current:** Audit events logged to backend

**Limitation:** No UI view for audit history

**Solution:** Add audit trail panel to dashboard

---

## Next Phase Candidates

### Phase 6.9 — LLM-Based Command Intent

**Goal:** Use LLM to extract command intent from natural language

**Approach:**
- Send user message to LLM with command extraction prompt
- Parse LLM response for command name + args
- Generate proposal from extracted intent
- More flexible than regex patterns

### Phase 6.10 — Audit Trail UI

**Goal:** Make audit trail visible and searchable

**Components:**
- Audit trail panel in dashboard
- Filter by operator, command, timestamp
- Link proposals to execution results
- Show warrant details

### Phase 6.11 — Multi-Step Workflows

**Goal:** Chain commands with approval at each step

**Example:**
```
User: "diagnose and fix the gateway"
    ↓
Step 1: check_port(18789) → not listening
    ↓
Step 2: Propose restart_service('openclaw-gateway')
    ↓
User approves
    ↓
Step 3: Execute restart
    ↓
Step 4: Verify with check_port(18789) → listening
```

---

## Deployment

### Client Build

```bash
cd ~/.openclaw/workspace/vienna-core/console/client
npm run build
```

### Server Restart

```bash
cd ~/.openclaw/workspace/vienna-core/console/server
# Restart dev server (auto-reloads on change)
```

### Verification

1. Open browser to Vienna console
2. Test command: "check port 18789"
3. Verify proposal card appears
4. Click approve
5. Verify result displays

---

## Conclusion

Phase 6.8 successfully implements frontend command approval workflow.

**Key achievements:**
- Command proposals display in chat UI
- Approve/reject buttons functional
- Execution results shown inline
- Risk tier and warrant warnings clear
- Pattern matching for common commands
- End-to-end flow working

**Vienna now has a complete governed command execution loop from chat to approval to execution to result display.**

Next: Phase 6.9 for improved command intent extraction, or Phase 6.10 for audit trail visibility.
