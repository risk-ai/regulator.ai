# Vienna OS Monorepo

Governed AI execution layer above OpenClaw.

## Structure

```
apps/
  marketing/        NextJS marketing site (regulator.ai)
  console/          
    client/         Vite + React console UI
    server/         Express backend
services/
  runtime/          Vienna Core governance runtime
```

## Deployment

- **Marketing:** Vercel (`regulator.ai`)
- **Console UI:** Vercel (`console.regulator.ai`)
- **Runtime:** Fly.io (`vienna-os.fly.dev`)

## Local Development

### Marketing Site
```bash
cd apps/marketing
npm install
npm run dev
```

### Console
```bash
# Client
cd apps/console/client
npm install
npm run dev

# Server
cd apps/console/server
npm install
npm start
```

### Runtime
```bash
cd services/runtime
npm install
npm start
```

## Configuration

See each service's `.env.example` for required environment variables.
