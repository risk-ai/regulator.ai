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
var warrant_chain_store_exports = {};
__export(warrant_chain_store_exports, {
  InMemoryWarrantChainStore: () => InMemoryWarrantChainStore,
  PostgresWarrantChainStore: () => PostgresWarrantChainStore
});
module.exports = __toCommonJS(warrant_chain_store_exports);
class InMemoryWarrantChainStore {
  chains = /* @__PURE__ */ new Map();
  anchors = /* @__PURE__ */ new Map();
  async appendWarrant(warrant) {
    const chain = this.chains.get(warrant.tenant_id) || [];
    if (chain.length > 0 && warrant.chain_index !== chain.length) {
      throw new Error(
        `Chain append violation: expected index ${chain.length}, got ${warrant.chain_index}`
      );
    }
    chain.push({ ...warrant });
    this.chains.set(warrant.tenant_id, chain);
  }
  async getLatest(tenantId) {
    const chain = this.chains.get(tenantId);
    if (!chain || chain.length === 0) return null;
    return { ...chain[chain.length - 1] };
  }
  async getByIndex(tenantId, index) {
    const chain = this.chains.get(tenantId);
    if (!chain || index >= chain.length) return null;
    return { ...chain[index] };
  }
  async getByWarrantId(warrantId) {
    for (const chain of this.chains.values()) {
      const found = chain.find((w) => w.warrant_id === warrantId);
      if (found) return { ...found };
    }
    return null;
  }
  async getChain(tenantId, fromIndex = 0, toIndex) {
    const chain = this.chains.get(tenantId) || [];
    const end = toIndex !== void 0 ? toIndex : chain.length;
    return chain.slice(fromIndex, end).map((w) => ({ ...w }));
  }
  async getChainLength(tenantId) {
    return (this.chains.get(tenantId) || []).length;
  }
  async saveAnchor(anchor) {
    const anchors = this.anchors.get(anchor.tenant_id) || [];
    anchors.push({ ...anchor });
    this.anchors.set(anchor.tenant_id, anchors);
  }
  async getLatestAnchor(tenantId) {
    const anchors = this.anchors.get(tenantId);
    if (!anchors || anchors.length === 0) return null;
    return { ...anchors[anchors.length - 1] };
  }
  /** Reset all data (testing) */
  clear() {
    this.chains.clear();
    this.anchors.clear();
  }
}
class PostgresWarrantChainStore {
  query;
  execute;
  constructor(deps) {
    this.query = deps.query;
    this.execute = deps.execute;
  }
  /**
   * Create the warrant_chain table if it doesn't exist.
   * Call this during server startup / migration.
   */
  async initialize() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS warrant_chain (
        id SERIAL PRIMARY KEY,
        warrant_id TEXT NOT NULL UNIQUE,
        chain_index INTEGER NOT NULL,
        tenant_id TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        prev_hash TEXT,
        chain_hash TEXT NOT NULL,
        warrant_data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        UNIQUE(tenant_id, chain_index)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_warrant_chain_tenant 
      ON warrant_chain(tenant_id, chain_index)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_warrant_chain_warrant_id 
      ON warrant_chain(warrant_id)
    `);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS warrant_chain_anchors (
        id SERIAL PRIMARY KEY,
        anchor_id TEXT NOT NULL UNIQUE,
        tenant_id TEXT NOT NULL,
        chain_root TEXT NOT NULL,
        merkle_root TEXT NOT NULL,
        chain_length INTEGER NOT NULL,
        anchored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        external_ref TEXT,
        method TEXT NOT NULL DEFAULT 'internal'
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_warrant_chain_anchors_tenant 
      ON warrant_chain_anchors(tenant_id, anchored_at DESC)
    `);
  }
  async appendWarrant(warrant) {
    await this.execute(
      `INSERT INTO warrant_chain 
        (warrant_id, chain_index, tenant_id, content_hash, prev_hash, chain_hash, warrant_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        warrant.warrant_id,
        warrant.chain_index,
        warrant.tenant_id,
        warrant.content_hash,
        warrant.prev_hash,
        warrant.chain_hash,
        JSON.stringify(warrant.warrant_data),
        warrant.created_at
      ]
    );
  }
  async getLatest(tenantId) {
    const rows = await this.query(
      `SELECT * FROM warrant_chain WHERE tenant_id = $1 ORDER BY chain_index DESC LIMIT 1`,
      [tenantId]
    );
    return rows.length > 0 ? this._rowToWarrant(rows[0]) : null;
  }
  async getByIndex(tenantId, index) {
    const rows = await this.query(
      `SELECT * FROM warrant_chain WHERE tenant_id = $1 AND chain_index = $2`,
      [tenantId, index]
    );
    return rows.length > 0 ? this._rowToWarrant(rows[0]) : null;
  }
  async getByWarrantId(warrantId) {
    const rows = await this.query(
      `SELECT * FROM warrant_chain WHERE warrant_id = $1`,
      [warrantId]
    );
    return rows.length > 0 ? this._rowToWarrant(rows[0]) : null;
  }
  async getChain(tenantId, fromIndex = 0, toIndex) {
    let sql = `SELECT * FROM warrant_chain WHERE tenant_id = $1 AND chain_index >= $2`;
    const params = [tenantId, fromIndex];
    if (toIndex !== void 0) {
      sql += ` AND chain_index < $3`;
      params.push(toIndex);
    }
    sql += ` ORDER BY chain_index ASC`;
    const rows = await this.query(sql, params);
    return rows.map(this._rowToWarrant);
  }
  async getChainLength(tenantId) {
    const rows = await this.query(
      `SELECT COUNT(*) as count FROM warrant_chain WHERE tenant_id = $1`,
      [tenantId]
    );
    return parseInt(rows[0]?.count || "0", 10);
  }
  async saveAnchor(anchor) {
    await this.execute(
      `INSERT INTO warrant_chain_anchors 
        (anchor_id, tenant_id, chain_root, merkle_root, chain_length, anchored_at, external_ref, method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        anchor.anchor_id,
        anchor.tenant_id,
        anchor.chain_root,
        anchor.merkle_root,
        anchor.chain_length,
        anchor.anchored_at,
        anchor.external_ref || null,
        anchor.method
      ]
    );
  }
  async getLatestAnchor(tenantId) {
    const rows = await this.query(
      `SELECT * FROM warrant_chain_anchors WHERE tenant_id = $1 ORDER BY anchored_at DESC LIMIT 1`,
      [tenantId]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      anchor_id: row.anchor_id,
      tenant_id: row.tenant_id,
      chain_root: row.chain_root,
      merkle_root: row.merkle_root,
      chain_length: row.chain_length,
      anchored_at: row.anchored_at,
      external_ref: row.external_ref || void 0,
      method: row.method
    };
  }
  _rowToWarrant(row) {
    return {
      warrant_id: row.warrant_id,
      chain_index: row.chain_index,
      tenant_id: row.tenant_id,
      content_hash: row.content_hash,
      prev_hash: row.prev_hash,
      chain_hash: row.chain_hash,
      warrant_data: typeof row.warrant_data === "string" ? JSON.parse(row.warrant_data) : row.warrant_data,
      created_at: row.created_at
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InMemoryWarrantChainStore,
  PostgresWarrantChainStore
});
