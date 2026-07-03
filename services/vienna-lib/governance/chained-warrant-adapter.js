"use strict";
/**
 * Chained Warrant Adapter — Vienna OS
 *
 * Wraps the existing warrant adapter to automatically append every
 * issued warrant to the Merkle Warrant Chain. This is the integration
 * point — existing code continues to work unchanged, but every warrant
 * now has cryptographic chain proof.
 *
 * Usage:
 *   const baseAdapter = existingAdapter;
 *   const chainStore = new PostgresWarrantChainStore({ query, execute });
 *   const chain = new MerkleWarrantChain(chainStore);
 *   const adapter = new ChainedWarrantAdapter(baseAdapter, chain, tenantId);
 *   const warrantSystem = new Warrant(adapter);
 *   // All warrants are now automatically chained
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainedWarrantAdapter = void 0;
class ChainedWarrantAdapter {
    constructor(base, chain, tenantId) {
        this.base = base;
        this.chain = chain;
        this.tenantId = tenantId;
    }
    async loadTruthSnapshot(id) {
        return this.base.loadTruthSnapshot(id);
    }
    /**
     * Save warrant AND append to Merkle chain.
     * This is the critical integration point.
     */
    async saveWarrant(warrant) {
        // Save to base storage first
        await this.base.saveWarrant(warrant);
        // Append to Merkle warrant chain
        try {
            const warrantData = {
                warrant_id: warrant.warrant_id,
                issued_by: warrant.issued_by,
                issued_at: warrant.issued_at,
                expires_at: warrant.expires_at,
                risk_tier: warrant.risk_tier,
                truth_snapshot_id: warrant.truth_snapshot_id,
                plan_id: warrant.plan_id,
                approval_ids: warrant.approval_ids || [],
                objective: warrant.objective,
                allowed_actions: warrant.allowed_actions || [],
                forbidden_actions: warrant.forbidden_actions || [],
                constraints: warrant.constraints || {},
                signature: warrant.signature || '',
            };
            const chainEntry = await this.chain.append(this.tenantId, warrantData);
            // Emit chain event
            await this.base.emitAudit({
                event_type: 'warrant_chained',
                warrant_id: warrant.warrant_id,
                chain_index: chainEntry.chain_index,
                chain_hash: chainEntry.chain_hash,
                content_hash: chainEntry.content_hash,
                prev_hash: chainEntry.prev_hash,
            });
        }
        catch (chainError) {
            // Log but don't fail warrant issuance if chain append fails
            // The warrant is still valid — chain is an additional integrity layer
            console.error(`[WarrantChain] Failed to append warrant ${warrant.warrant_id} to chain:`, chainError);
            await this.base.emitAudit({
                event_type: 'warrant_chain_error',
                warrant_id: warrant.warrant_id,
                error: chainError instanceof Error ? chainError.message : String(chainError),
                severity: 'warning',
            });
        }
    }
    async loadWarrant(id) {
        return this.base.loadWarrant(id);
    }
    async listWarrants() {
        return this.base.listWarrants();
    }
    async emitAudit(event) {
        return this.base.emitAudit(event);
    }
}
exports.ChainedWarrantAdapter = ChainedWarrantAdapter;
exports.default = ChainedWarrantAdapter;
