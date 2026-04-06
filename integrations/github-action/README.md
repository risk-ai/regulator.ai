# Vienna OS Govern Action

Governed CI/CD — get an execution warrant from Vienna OS before deploying.

## Usage

```yaml
name: Governed Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Request deployment warrant
        uses: vienna-os/govern-action@v1
        id: govern
        with:
          vienna-url: https://console.regulator.ai
          api-key: ${{ secrets.VIENNA_API_KEY }}
          action: deploy.production
          context: '{"environment": "production", "branch": "${{ github.ref_name }}"}'

      - name: Deploy
        if: steps.govern.outputs.status == 'approved'
        run: ./deploy.sh
        env:
          WARRANT_ID: ${{ steps.govern.outputs.warrant-id }}
          OWS_TOKEN: ${{ steps.govern.outputs.ows-token }}
```

## How it works

1. **Submit intent** — the action tells Vienna OS what you want to do
2. **Policy evaluation** — Vienna evaluates the intent against your policies
3. **Auto-approve (T0/T1)** — low-risk actions are approved instantly
4. **Wait for approval (T2/T3)** — high-risk actions wait for human approval
5. **Warrant issued** — on approval, a cryptographic warrant is issued
6. **Pipeline continues** — the warrant ID and OWS token are available as outputs

If governance **denies** the action, the step fails and the pipeline stops.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `vienna-url` | ✅ | `https://console.regulator.ai` | Vienna OS API URL |
| `api-key` | ✅ | — | API key (`vos_xxx`) |
| `action` | ✅ | — | Action being performed |
| `agent-id` | | `github-actions` | Agent identifier |
| `risk-tier` | | auto | Risk tier override |
| `context` | | `{}` | Additional JSON context |
| `timeout` | | `300` | Approval timeout (seconds) |
| `fail-on-deny` | | `true` | Fail step on denial |

## Outputs

| Output | Description |
|--------|-------------|
| `warrant-id` | Warrant ID (if approved) |
| `ows-token` | Open Warrant Standard token |
| `status` | `approved`, `denied`, `pending`, `timeout` |
| `risk-tier` | Classified risk tier |
| `intent-id` | Intent tracking ID |

## Risk Tiers

| Tier | Behavior |
|------|----------|
| T0 | Auto-approved instantly |
| T1 | Auto-approved with warrant |
| T2 | Waits for single human approval |
| T3 | Waits for multi-party approval |
