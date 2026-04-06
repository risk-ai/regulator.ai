# Vienna OS Terraform Provider

Manage Vienna OS governance resources via Terraform.

## Requirements

- Terraform >= 1.0
- Go >= 1.21 (for building)
- Vienna OS API key

## Usage

```hcl
terraform {
  required_providers {
    vienna = {
      source  = "registry.terraform.io/vienna-os/vienna"
      version = "~> 1.0"
    }
  }
}

provider "vienna" {
  url     = "https://console.regulator.ai"
  api_key = var.vienna_api_key
}

# Create a governance policy
resource "vienna_policy" "block_prod_deploys" {
  name        = "Block unreviewed production deploys"
  description = "All production deployments require approval"
  decision    = "require_approval"
  priority    = 100
  enabled     = true

  scope_objectives   = ["deploy.production"]
  scope_environments = ["production"]
  approval_required  = true
}

# Register an agent
resource "vienna_agent" "deploy_bot" {
  name         = "deploy-bot"
  description  = "Automated deployment agent"
  capabilities = ["deploy.staging", "deploy.production"]
}

# Configure Slack integration
resource "vienna_integration" "slack_approvals" {
  name    = "Slack Approvals"
  type    = "slack"
  enabled = true

  config = {
    webhook_url = var.slack_webhook_url
    channel     = "#governance"
  }

  events = [
    "approval_required",
    "approval_resolved",
    "action_executed",
  ]
}

# Data sources
data "vienna_chain" "status" {}

output "chain_length" {
  value = data.vienna_chain.status.chain_length
}
```

## Resources

| Resource | Description |
|----------|-------------|
| `vienna_policy` | Governance policies (CRUD) |
| `vienna_agent` | Agent registrations |
| `vienna_integration` | External integrations (Slack, email, webhook) |

## Data Sources

| Data Source | Description |
|-------------|-------------|
| `vienna_policy` | Read a policy by ID |
| `vienna_agent` | Read an agent by ID |
| `vienna_fleet` | Fleet-wide status (agent counts) |
| `vienna_chain` | Warrant chain status (length, root hash) |

## Building

```bash
cd packages/terraform-provider-vienna
go build -o terraform-provider-vienna
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VIENNA_URL` | API URL (default: https://console.regulator.ai) |
| `VIENNA_API_KEY` | API key (vos_xxx) |
