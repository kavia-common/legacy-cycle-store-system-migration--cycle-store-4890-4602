# Test Automation Service

This service exposes a REST API to manage test suites, trigger executions using Playwright/Selenium (via environment-configured commands), and retrieve results/logs/reports.

## Quick start

- Copy `.env.example` to `.env` and set your desired executor (e.g., PLAYWRIGHT_CMD="npx playwright test --reporter=list").
- Install dependencies: `npm install`
- Start development server: `npm run dev`
- Visit Swagger Docs at `/docs`

## Endpoints (selection)

- GET `/` health
- CRUD `/api/test-suites`
- POST `/api/test-suites/execute` body: `{ "suiteId": "uuid", "environment": "dev" }`
- GET `/api/test-results?suiteId=&status=`
- GET `/api/test-results/{id}/logs`
- GET `/api/reports/{id}`

## Test folders

- `tests/e2e` - End-to-end tests (Playwright/Selenium)
- `tests/integration` - Integration tests
- `tests/unit` - Unit tests
- `tests/performance` - Performance tests

## Notes

- The demo stores suites and results in `./storage/*.json`.
- Reports and logs are saved to `./storage/reports` and `./storage/results`.
- Configure executor via env: `PLAYWRIGHT_CMD`, `SELENIUM_CMD`, or `TEST_EXECUTOR` (e.g., `jest`).
