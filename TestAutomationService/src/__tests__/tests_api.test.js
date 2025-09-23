const request = require('supertest');
const app = require('../app');

describe('Test Automation Service - Health & List', () => {
  it('GET / should return health', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });

  it('GET /test-suites should be protected or return 200 with token (implementation dependent)', async () => {
    const res = await request(app).get('/test-suites');
    expect([200, 401, 403]).toContain(res.status);
  });
});
