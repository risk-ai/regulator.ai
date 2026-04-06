var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var chained_warrant_adapter_exports = {};
__export(chained_warrant_adapter_exports, {
  ChainedWarrantAdapter: () => ChainedWarrantAdapter,
  default: () => chained_warrant_adapter_default
});
module.exports = __toCommonJS(chained_warrant_adapter_exports);
class ChainedWarrantAdapter {
  base;
  chain;
  tenantId;
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
    await this.base.saveWarrant(warrant);
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
        signature: warrant.signature || ""
      };
      const chainEntry = await this.chain.append(this.tenantId, warrantData);
      await this.base.emitAudit({
        event_type: "warrant_chained",
        warrant_id: warrant.warrant_id,
        chain_index: chainEntry.chain_index,
        chain_hash: chainEntry.chain_hash,
        content_hash: chainEntry.content_hash,
        prev_hash: chainEntry.prev_hash
      });
    } catch (chainError) {
      console.error(
        `[WarrantChain] Failed to append warrant ${warrant.warrant_id} to chain:`,
        chainError
      );
      await this.base.emitAudit({
        event_type: "warrant_chain_error",
        warrant_id: warrant.warrant_id,
        error: chainError instanceof Error ? chainError.message : String(chainError),
        severity: "warning"
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
var chained_warrant_adapter_default = ChainedWarrantAdapter;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChainedWarrantAdapter
});
