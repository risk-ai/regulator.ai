# Adapter Layer Plan — Vienna Runtime ↔ Product Shell

**Date:** 2026-03-14  
**Stage:** Stage 2 Architecture Reconciliation  
**Purpose:** Define adapter architecture isolating Vienna runtime from Next.js dependencies

---

## Core Principle

**Vienna runtime must NOT depend on Next.js code.**

Vienna is a standalone service. It should work:

- In development (localhost)
- In production (Fly.io OR self-hosted Docker)
- With OR without Next.js product shell

**Adapters provide:**
- Database abstraction (Drizzle ↔ State Graph)
- Storage abstraction (Filesystem ↔ Vercel Blob ↔ S3)
- Policy abstraction (Neon policies ↔ Vienna policies)
- Execution abstraction (Vienna executor ↔ external systems)

---

## Adapter Architecture

```
Vienna Runtime (Standalone)
├── Core Logic
│   ├── State Graph (source of truth)
│   ├── Governance Engine
│   ├── Objective Evaluator
│   ├── Execution Engine
│   └── Background Services
│
└── Adapters (Abstraction Layer)
    ├── Database Adapter (Drizzle integration)
    ├── Storage Adapter (Artifact storage)
    ├── Policy Adapter (Policy sync)
    └── Execution Adapter (External commands)
```

**Rule:** Vienna core imports adapters, adapters import external dependencies (NOT vice versa).

---

## Directory Structure

```
services/vienna-runtime/
├── lib/
│   ├── core/                    (Vienna core logic)
│   ├── state/                   (State Graph)
│   ├── governance/              (Policy, warrant, execution)
│   └── execution/               (Execution engine)
│
├── adapters/                    (Abstraction layer, NEW)
│   ├── database/
│   │   ├── drizzle-adapter.ts   (Drizzle ORM integration)
│   │   └── state-graph-sync.ts  (State Graph ↔ Neon sync)
│   ├── storage/
│   │   ├── filesystem-adapter.ts (Local filesystem, dev/self-hosted)
│   │   ├── s3-adapter.ts        (AWS S3, production option)
│   │   └── vercel-blob-adapter.ts (Vercel Blob, production option)
│   ├── policy/
│   │   └── policy-sync-adapter.ts (Neon policies ↔ Vienna policies)
│   └── execution/
│       └── command-adapter.ts   (External command execution)
│
├── server.ts                    (HTTP server entry point)
└── package.json
```

---

## Adapter 1: Database Adapter

**Purpose:** Sync lightweight references between Vienna State Graph and Neon Postgres

**Use Case:**

- User creates investigation in product UI
- Next.js writes to Neon `investigation_refs` AND Vienna State Graph
- Vienna State Graph = source of truth
- Neon = lightweight ownership/metadata cache

**Implementation:**

```typescript
// adapters/database/drizzle-adapter.ts

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './neon-schema'

export class DrizzleAdapter {
  private db: ReturnType<typeof drizzle>

  constructor(databaseUrl: string) {
    const sql = neon(databaseUrl)
    this.db = drizzle(sql, { schema })
  }

  // Investigation reference sync
  async storeInvestigationRef(investigation: Investigation) {
    return this.db.insert(schema.investigationRefs).values({
      investigationId: investigation.id,
      userId: investigation.created_by,
      name: investigation.name,
      status: investigation.status,
      createdAt: investigation.created_at
    })
  }

  async getInvestigationRefs(userId: string, filters?: { status?: string }) {
    const query = this.db.select().from(schema.investigationRefs)
      .where(eq(schema.investigationRefs.userId, userId))

    if (filters?.status) {
      query.where(eq(schema.investigationRefs.status, filters.status))
    }

    return query.execute()
  }

  // Artifact reference sync
  async storeArtifactRef(artifact: Artifact) {
    return this.db.insert(schema.artifactRefs).values({
      artifactId: artifact.id,
      investigationId: artifact.investigation_id,
      artifactType: artifact.artifact_type,
      name: artifact.file_path.split('/').pop(),
      sizeBytes: artifact.size_bytes,
      createdAt: artifact.created_at
    })
  }

  // Policy sync
  async getPolicies(filters?: { enabled?: boolean }) {
    const query = this.db.select().from(schema.policies)

    if (filters?.enabled !== undefined) {
      query.where(eq(schema.policies.enabled, filters.enabled))
    }

    return query.execute()
  }

  async storePolicy(policy: Policy) {
    return this.db.insert(schema.policies).values({
      name: policy.name,
      description: policy.description,
      rules: policy.constraints, // Transform Vienna constraints → Neon rules
      enabled: policy.enabled
    })
  }
}
```

**Configuration:**

```typescript
// services/vienna-runtime/server.ts

import { DrizzleAdapter } from './adapters/database/drizzle-adapter'

const databaseAdapter = process.env.DATABASE_URL
  ? new DrizzleAdapter(process.env.DATABASE_URL)
  : null // Optional: Vienna can run without Neon sync

// Pass adapter to Vienna components that need it
const investigationManager = new InvestigationManager({
  stateGraph,
  databaseAdapter // Optional, used for reference sync
})
```

---

## Adapter 2: Storage Adapter

**Purpose:** Abstract artifact storage (filesystem, S3, Vercel Blob)

**Interface:**

```typescript
// adapters/storage/storage-adapter.interface.ts

export interface StorageAdapter {
  store(artifactId: string, content: string | Buffer): Promise<StorageResult>
  retrieve(artifactId: string): Promise<string | Buffer>
  delete(artifactId: string): Promise<void>
  exists(artifactId: string): Promise<boolean>
  getMetadata(artifactId: string): Promise<StorageMetadata>
}

export interface StorageResult {
  file_path: string
  size_bytes: number
  content_hash: string
  stored_at: string
}

export interface StorageMetadata {
  size_bytes: number
  mime_type: string
  created_at: string
}
```

---

### Filesystem Adapter (Development + Self-Hosted)

```typescript
// adapters/storage/filesystem-adapter.ts

import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export class FilesystemAdapter implements StorageAdapter {
  private basePath: string

  constructor(basePath: string = '~/.vienna/runtime/workspace') {
    this.basePath = basePath
  }

  async store(artifactId: string, content: string | Buffer): Promise<StorageResult> {
    const artifactPath = this.getArtifactPath(artifactId)
    const dir = path.dirname(artifactPath)

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })

    // Write content
    await fs.writeFile(artifactPath, content)

    // Compute hash
    const hash = crypto.createHash('sha256').update(content).digest('hex')

    // Get file stats
    const stats = await fs.stat(artifactPath)

    return {
      file_path: artifactPath,
      size_bytes: stats.size,
      content_hash: `sha256:${hash}`,
      stored_at: new Date().toISOString()
    }
  }

  async retrieve(artifactId: string): Promise<string | Buffer> {
    const artifactPath = this.getArtifactPath(artifactId)
    return fs.readFile(artifactPath)
  }

  async delete(artifactId: string): Promise<void> {
    const artifactPath = this.getArtifactPath(artifactId)
    await fs.unlink(artifactPath)
  }

  async exists(artifactId: string): Promise<boolean> {
    const artifactPath = this.getArtifactPath(artifactId)
    try {
      await fs.access(artifactPath)
      return true
    } catch {
      return false
    }
  }

  async getMetadata(artifactId: string): Promise<StorageMetadata> {
    const artifactPath = this.getArtifactPath(artifactId)
    const stats = await fs.stat(artifactPath)

    return {
      size_bytes: stats.size,
      mime_type: this.guessMimeType(artifactPath),
      created_at: stats.birthtime.toISOString()
    }
  }

  private getArtifactPath(artifactId: string): string {
    // artifacts/2026-03-14/art_20260314_001.json
    const date = artifactId.split('_')[1] // Extract date from ID
    const year = date.substring(0, 4)
    const month = date.substring(4, 6)
    const day = date.substring(6, 8)

    return path.join(
      this.basePath,
      'artifacts',
      `${year}-${month}-${day}`,
      `${artifactId}.json`
    )
  }

  private guessMimeType(filePath: string): string {
    if (filePath.endsWith('.json')) return 'application/json'
    if (filePath.endsWith('.md')) return 'text/markdown'
    if (filePath.endsWith('.txt')) return 'text/plain'
    return 'application/octet-stream'
  }
}
```

---

### S3 Adapter (Production Option)

```typescript
// adapters/storage/s3-adapter.ts

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

export class S3Adapter implements StorageAdapter {
  private s3: S3Client
  private bucket: string

  constructor(config: { region: string; bucket: string; accessKeyId: string; secretAccessKey: string }) {
    this.s3 = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
    this.bucket = config.bucket
  }

  async store(artifactId: string, content: string | Buffer): Promise<StorageResult> {
    const key = this.getS3Key(artifactId)
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/json',
      Metadata: {
        'content-hash': hash
      }
    }))

    return {
      file_path: `s3://${this.bucket}/${key}`,
      size_bytes: buffer.length,
      content_hash: `sha256:${hash}`,
      stored_at: new Date().toISOString()
    }
  }

  async retrieve(artifactId: string): Promise<string | Buffer> {
    const key = this.getS3Key(artifactId)
    const response = await this.s3.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    }))

    return response.Body.transformToByteArray()
  }

  async delete(artifactId: string): Promise<void> {
    const key = this.getS3Key(artifactId)
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    }))
  }

  async exists(artifactId: string): Promise<boolean> {
    const key = this.getS3Key(artifactId)
    try {
      await this.s3.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      }))
      return true
    } catch {
      return false
    }
  }

  async getMetadata(artifactId: string): Promise<StorageMetadata> {
    const key = this.getS3Key(artifactId)
    const response = await this.s3.send(new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key
    }))

    return {
      size_bytes: response.ContentLength,
      mime_type: response.ContentType,
      created_at: response.LastModified.toISOString()
    }
  }

  private getS3Key(artifactId: string): string {
    const date = artifactId.split('_')[1]
    return `artifacts/${date}/${artifactId}.json`
  }
}
```

---

### Vercel Blob Adapter (Production Option)

```typescript
// adapters/storage/vercel-blob-adapter.ts

import { put, del, head } from '@vercel/blob'
import crypto from 'crypto'

export class VercelBlobAdapter implements StorageAdapter {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  async store(artifactId: string, content: string | Buffer): Promise<StorageResult> {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')

    const blob = await put(artifactId, buffer, {
      access: 'public',
      token: this.token,
      contentType: 'application/json'
    })

    return {
      file_path: blob.url,
      size_bytes: buffer.length,
      content_hash: `sha256:${hash}`,
      stored_at: new Date().toISOString()
    }
  }

  async retrieve(artifactId: string): Promise<string | Buffer> {
    const response = await fetch(this.getBlobUrl(artifactId))
    return response.arrayBuffer()
  }

  async delete(artifactId: string): Promise<void> {
    await del(this.getBlobUrl(artifactId), { token: this.token })
  }

  async exists(artifactId: string): Promise<boolean> {
    const metadata = await head(this.getBlobUrl(artifactId), { token: this.token })
    return !!metadata
  }

  async getMetadata(artifactId: string): Promise<StorageMetadata> {
    const metadata = await head(this.getBlobUrl(artifactId), { token: this.token })

    return {
      size_bytes: metadata.size,
      mime_type: metadata.contentType,
      created_at: metadata.uploadedAt.toISOString()
    }
  }

  private getBlobUrl(artifactId: string): string {
    return `https://your-blob-domain.vercel-storage.com/${artifactId}`
  }
}
```

---

### Storage Factory (Runtime Configuration)

```typescript
// adapters/storage/storage-factory.ts

import { FilesystemAdapter } from './filesystem-adapter'
import { S3Adapter } from './s3-adapter'
import { VercelBlobAdapter } from './vercel-blob-adapter'

export function createStorageAdapter(): StorageAdapter {
  const storageType = process.env.STORAGE_TYPE || 'filesystem'

  switch (storageType) {
    case 'filesystem':
      return new FilesystemAdapter(process.env.ARTIFACT_STORAGE_PATH)

    case 's3':
      return new S3Adapter({
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_S3_BUCKET,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      })

    case 'vercel-blob':
      return new VercelBlobAdapter(process.env.BLOB_READ_WRITE_TOKEN)

    default:
      throw new Error(`Unknown storage type: ${storageType}`)
  }
}
```

**Usage in Vienna Runtime:**

```typescript
// services/vienna-runtime/server.ts

import { createStorageAdapter } from './adapters/storage/storage-factory'

const storageAdapter = createStorageAdapter()

const workspaceManager = new WorkspaceManager({
  stateGraph,
  storageAdapter // Inject storage adapter
})
```

---

## Adapter 3: Policy Adapter

**Purpose:** Sync policies between Neon (product UI) and Vienna State Graph

**Implementation:**

```typescript
// adapters/policy/policy-sync-adapter.ts

import { DrizzleAdapter } from '../database/drizzle-adapter'
import { StateGraph } from '../../lib/state/state-graph'

export class PolicySyncAdapter {
  constructor(
    private drizzleAdapter: DrizzleAdapter,
    private stateGraph: StateGraph
  ) {}

  // Sync Neon policy → Vienna State Graph
  async syncToVienna(neonPolicyId: string) {
    const neonPolicies = await this.drizzleAdapter.getPolicies()
    const neonPolicy = neonPolicies.find(p => p.id === neonPolicyId)

    if (!neonPolicy) {
      throw new Error(`Policy ${neonPolicyId} not found in Neon`)
    }

    // Transform Neon policy → Vienna policy
    const viennaPolicy = {
      policy_id: neonPolicy.id,
      name: neonPolicy.name,
      description: neonPolicy.description,
      priority: 100, // Default priority
      constraints: this.transformRulesToConstraints(neonPolicy.rules),
      action_on_match: 'allow',
      enabled: neonPolicy.enabled
    }

    // Store in Vienna State Graph
    await this.stateGraph.createPolicy(viennaPolicy)
  }

  // Sync Vienna policy → Neon
  async syncFromVienna(viennaPolicyId: string) {
    const viennaPolicy = await this.stateGraph.getPolicy(viennaPolicyId)

    if (!viennaPolicy) {
      throw new Error(`Policy ${viennaPolicyId} not found in Vienna`)
    }

    // Transform Vienna policy → Neon policy
    const neonPolicy = {
      id: viennaPolicy.policy_id,
      name: viennaPolicy.name,
      description: viennaPolicy.description,
      rules: this.transformConstraintsToRules(viennaPolicy.constraints),
      enabled: viennaPolicy.enabled
    }

    // Store in Neon
    await this.drizzleAdapter.storePolicy(neonPolicy)
  }

  // Transform Neon rules (jsonb) → Vienna constraints (array)
  private transformRulesToConstraints(rules: any): Constraint[] {
    // Example transformation logic
    if (!rules || typeof rules !== 'object') return []

    const constraints: Constraint[] = []

    if (rules.time_window) {
      constraints.push({
        type: 'time_window',
        config: rules.time_window
      })
    }

    if (rules.risk_tier) {
      constraints.push({
        type: 'approval_required',
        config: { min_risk_tier: rules.risk_tier }
      })
    }

    return constraints
  }

  // Transform Vienna constraints → Neon rules (jsonb)
  private transformConstraintsToRules(constraints: Constraint[]): any {
    const rules: any = {}

    for (const constraint of constraints) {
      if (constraint.type === 'time_window') {
        rules.time_window = constraint.config
      }

      if (constraint.type === 'approval_required') {
        rules.risk_tier = constraint.config.min_risk_tier
      }
    }

    return rules
  }
}
```

---

## Adapter 4: Execution Adapter

**Purpose:** Abstract external command execution (systemctl, scripts, APIs)

**Implementation:**

```typescript
// adapters/execution/command-adapter.ts

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class CommandAdapter {
  async executeSystemctl(action: 'start' | 'stop' | 'restart' | 'status', service: string) {
    const command = `systemctl --user ${action} ${service}`

    try {
      const { stdout, stderr } = await execAsync(command)
      return {
        success: true,
        exit_code: 0,
        stdout,
        stderr
      }
    } catch (error) {
      return {
        success: false,
        exit_code: error.code,
        stdout: error.stdout,
        stderr: error.stderr
      }
    }
  }

  async executeScript(scriptPath: string, args: string[] = []) {
    const command = `${scriptPath} ${args.join(' ')}`

    try {
      const { stdout, stderr } = await execAsync(command)
      return {
        success: true,
        exit_code: 0,
        stdout,
        stderr
      }
    } catch (error) {
      return {
        success: false,
        exit_code: error.code,
        stdout: error.stdout,
        stderr: error.stderr
      }
    }
  }

  async checkTcpPort(host: string, port: number, timeoutMs: number = 5000) {
    const net = require('net')
    return new Promise((resolve) => {
      const socket = new net.Socket()
      socket.setTimeout(timeoutMs)

      socket.on('connect', () => {
        socket.destroy()
        resolve(true)
      })

      socket.on('timeout', () => {
        socket.destroy()
        resolve(false)
      })

      socket.on('error', () => {
        socket.destroy()
        resolve(false)
      })

      socket.connect(port, host)
    })
  }
}
```

---

## Configuration

**Environment Variables:**

```bash
# Database adapter
DATABASE_URL=postgresql://user:pass@neon.tech/db

# Storage adapter
STORAGE_TYPE=filesystem # OR s3 OR vercel-blob
ARTIFACT_STORAGE_PATH=~/.vienna/runtime/workspace

# S3 storage (if STORAGE_TYPE=s3)
AWS_REGION=us-east-1
AWS_S3_BUCKET=vienna-artifacts
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Vercel Blob (if STORAGE_TYPE=vercel-blob)
BLOB_READ_WRITE_TOKEN=...
```

**Runtime Initialization:**

```typescript
// services/vienna-runtime/server.ts

import { createStorageAdapter } from './adapters/storage/storage-factory'
import { DrizzleAdapter } from './adapters/database/drizzle-adapter'
import { PolicySyncAdapter } from './adapters/policy/policy-sync-adapter'
import { CommandAdapter } from './adapters/execution/command-adapter'

// Initialize adapters
const storageAdapter = createStorageAdapter()
const databaseAdapter = process.env.DATABASE_URL
  ? new DrizzleAdapter(process.env.DATABASE_URL)
  : null

const policySyncAdapter = databaseAdapter
  ? new PolicySyncAdapter(databaseAdapter, stateGraph)
  : null

const commandAdapter = new CommandAdapter()

// Pass adapters to Vienna components
const workspaceManager = new WorkspaceManager({ stateGraph, storageAdapter })
const executionEngine = new ExecutionEngine({ stateGraph, commandAdapter })
```

---

## Testing Strategy

### Unit Tests (Adapter Isolation)

Test each adapter independently:

```typescript
// adapters/storage/__tests__/filesystem-adapter.test.ts

import { FilesystemAdapter } from '../filesystem-adapter'
import fs from 'fs/promises'

describe('FilesystemAdapter', () => {
  let adapter: FilesystemAdapter
  const testBasePath = '/tmp/vienna-test'

  beforeEach(() => {
    adapter = new FilesystemAdapter(testBasePath)
  })

  afterEach(async () => {
    await fs.rm(testBasePath, { recursive: true, force: true })
  })

  it('stores artifact to filesystem', async () => {
    const result = await adapter.store('art_20260314_001', '{"test": true}')

    expect(result.file_path).toContain('art_20260314_001.json')
    expect(result.size_bytes).toBeGreaterThan(0)
    expect(result.content_hash).toMatch(/^sha256:/)
  })

  it('retrieves artifact from filesystem', async () => {
    await adapter.store('art_20260314_001', '{"test": true}')
    const content = await adapter.retrieve('art_20260314_001')

    expect(content.toString()).toBe('{"test": true}')
  })
})
```

---

### Integration Tests (Adapter + Vienna Core)

Test adapters integrated with Vienna components:

```typescript
// tests/integration/workspace-adapter.test.ts

import { WorkspaceManager } from '../../lib/workspace/workspace-manager'
import { StateGraph } from '../../lib/state/state-graph'
import { FilesystemAdapter } from '../../adapters/storage/filesystem-adapter'

describe('WorkspaceManager with FilesystemAdapter', () => {
  let workspaceManager: WorkspaceManager
  let stateGraph: StateGraph
  let storageAdapter: FilesystemAdapter

  beforeEach(async () => {
    stateGraph = new StateGraph({ environment: 'test' })
    await stateGraph.initialize()

    storageAdapter = new FilesystemAdapter('/tmp/vienna-test')
    workspaceManager = new WorkspaceManager({ stateGraph, storageAdapter })
  })

  it('creates investigation and stores artifact', async () => {
    const investigation = await workspaceManager.createInvestigation({
      name: 'Test Investigation',
      description: 'Test',
      created_by: 'test@example.com'
    })

    const artifact = await workspaceManager.storeArtifact({
      artifact_type: 'trace',
      content: '{"test": true}',
      investigation_id: investigation.id,
      created_by: 'test@example.com'
    })

    expect(artifact.file_path).toContain('traces')
    expect(artifact.size_bytes).toBeGreaterThan(0)

    const content = await storageAdapter.retrieve(artifact.id)
    expect(content.toString()).toBe('{"test": true}')
  })
})
```

---

## Benefits of Adapter Pattern

### 1. Vienna Runtime Independence

Vienna can run standalone without Next.js:

```bash
# Development (local filesystem)
STORAGE_TYPE=filesystem node services/vienna-runtime/server.js

# Production (S3 storage, Neon database)
STORAGE_TYPE=s3 DATABASE_URL=... node services/vienna-runtime/server.js
```

---

### 2. Deployment Flexibility

Swap storage backends without changing Vienna core:

- **Development:** Filesystem adapter (fast, simple)
- **Self-Hosted:** Filesystem adapter OR S3 adapter
- **Vercel Production:** Vercel Blob adapter
- **AWS Production:** S3 adapter

---

### 3. Testing Simplification

Mock adapters for unit tests:

```typescript
const mockStorage = {
  store: jest.fn(),
  retrieve: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  getMetadata: jest.fn()
}

const workspaceManager = new WorkspaceManager({
  stateGraph,
  storageAdapter: mockStorage
})
```

---

### 4. Technology Migration

Change underlying tech without breaking Vienna:

- Drizzle ORM → Prisma (adapter update only)
- Neon → Postgres (connection string change)
- Filesystem → S3 (env variable change)

---

**Status:** Adapter layer plan complete  
**Next:** STAGE_2_ARCHITECTURE_COMPLETE.md
