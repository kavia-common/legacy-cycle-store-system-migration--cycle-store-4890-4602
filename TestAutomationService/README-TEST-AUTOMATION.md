# TestAutomationService

Purpose: Orchestrates Selenium-based automated tests; exposes REST APIs for managing suites, triggering executions, retrieving results/logs, integrates with CI/CD pipelines, and sends notifications/logs to internal services. Secured with JWT and RBAC.

Quick start:
1. Copy .env.example to .env and set values (JWT, Selenium URL, BASE URLs).
2. Install deps: npm install
3. Run dev: npm run dev
4. Open API docs: http://localhost:3000/docs

Key endpoints:
- GET /            -> health
- GET /test-suites -> list (JWT roles: admin|tester|viewer)
- POST /test-suites -> create (admin|tester)
- GET /test-suites/{id} -> get (admin|tester|viewer)
- PUT /test-suites/{id} -> update (admin|tester)
- DELETE /test-suites/{id} -> delete (admin)
- POST /test-suites/execute -> run suite async (admin|tester)
- GET /test-results -> results list (filters: suiteId,status)
- GET /test-results/{id}/logs -> execution logs
- GET /reports/{id} -> report URL
- POST /webhooks -> register webhook (admin)

Security:
- Bearer JWT in Authorization header.
- Roles supported: admin, tester, viewer (from claim: roles[] or scope string).
- Configure JWT_PUBLIC_KEY or JWT_SECRET in .env.

CI/CD:
- Trigger POST /test-suites/execute from pipelines.
- Poll /test-results?suiteId=... for status; fail pipeline on "failed".
- Generate OpenAPI: npm run generate:openapi (outputs interfaces/openapi.json)

Notes:
- In-memory storage; replace store.js with persistent DB for production use.
- testOrchestrator.js contains basic step interpreter. Extend for real-world flows.
