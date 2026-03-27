.PHONY: dev test build deploy clean

# Local development
dev:
	docker compose up

dev-console:
	cd apps/console/server && npm run dev

dev-marketing:
	cd apps/marketing && npm run dev

# Testing
test:
	node --test services/vienna-lib/test/*.test.js
	node scripts/integration-test.js

test-sdk:
	cd packages/sdk && npx tsc && npm test

# Building
build:
	cd apps/marketing && npm run build
	cd apps/console/server && npm run build:prod
	cd packages/sdk && npx tsc

build-docker:
	docker compose build

# Deploy
deploy-console:
	cd apps/console/server && fly deploy --remote-only -a vienna-os

deploy-marketing:
	cd apps/marketing && vercel --prod

# Publishing
publish-sdk:
	cd packages/sdk && npm publish --access public
	cd packages/python-sdk && python -m build && twine upload dist/*

# Cleanup
clean:
	rm -rf apps/console/server/build apps/console/server/dist
	rm -rf apps/console/client/dist
	rm -rf packages/sdk/dist
	rm -rf apps/marketing/.next