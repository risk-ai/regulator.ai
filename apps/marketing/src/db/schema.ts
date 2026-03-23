import { pgSchema, uuid, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core'

export const regulator = pgSchema('regulator')

export const proposals = regulator.table('proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: text('agent_id').notNull(),
  action: text('action').notNull(),
  payload: jsonb('payload'),
  riskTier: integer('risk_tier').notNull().default(0),
  state: text('state').notNull().default('submitted'),
  // submitted → validated → policy_checked → authorized → executing → executed → verified → archived
  warrantId: uuid('warrant_id'),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const policies = regulator.table('policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  rules: jsonb('rules').notNull(),
  riskTier: integer('risk_tier'),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const warrants = regulator.table('warrants', {
  id: uuid('id').defaultRandom().primaryKey(),
  proposalId: uuid('proposal_id').notNull(),
  signature: text('signature').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').default(false),
  revokedAt: timestamp('revoked_at'),
  revokedReason: text('revoked_reason'),
  issuedBy: text('issued_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const auditLog = regulator.table('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  proposalId: uuid('proposal_id'),
  warrantId: uuid('warrant_id'),
  event: text('event').notNull(),
  actor: text('actor').notNull(),
  riskTier: integer('risk_tier'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const adapters = regulator.table('adapters', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // deployment, api, database, email, etc
  config: jsonb('config'),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})
