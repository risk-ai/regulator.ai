# Vienna OS Terraform Provider

> ⚠️ **Status: Schema Reference Only** — This directory contains a schema reference (`schema.tf`) that documents the planned Terraform provider resources and data sources. The actual provider binary is not yet implemented.

## Planned Resources

- `vienna_policy` — Governance policy management
- `vienna_action_type` — Custom action type definitions
- `vienna_agent` — Agent registration and configuration
- `vienna_integration` — External system integrations (Slack, email, Datadog)

## Planned Data Sources

- `vienna_fleet_status` — Fleet-wide agent status
- `vienna_audit_log` — Audit log queries
- `vienna_policy_evaluation` — Policy dry-run testing
- `vienna_usage_metrics` — Tenant usage statistics

## Contributing

If you'd like to help build the Terraform provider, see [CONTRIBUTING.md](../../CONTRIBUTING.md) and open an issue to discuss implementation.
