#!/bin/bash
# Start Vienna Console Server with environment variables

export NODE_ENV="production"
export JWT_SECRET="6586b367b38f099dde55d31409e558c0d44935feb81dd824f64f9e1a89ebf20d"
export VIENNA_SESSION_SECRET="6586b367b38f099dde55d31409e558c0d44935feb81dd824f64f9e1a89ebf20d"
export POSTGRES_URL="postgresql://vienna:vienna2024@localhost:5432/vienna_prod"
export PORT="3100"
export HOST="0.0.0.0"
export CORS_ORIGIN="https://console.regulator.ai,https://regulator.ai,http://localhost:3100"

cd /home/maxlawai/regulator.ai/apps/console/server
exec npx tsx watch src/server.ts
