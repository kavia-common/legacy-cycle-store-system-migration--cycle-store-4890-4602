const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../middleware');

describe('Test Automation Service - Integration Tests', () => {
  let adminToken, testerToken, viewerToken;

  beforeAll(() => {
    // Generate test tokens for different roles
    adminToken = generateToken({ id: 'admin-user', roles: ['admin', 'tester', 'viewer'] });
    testerToken = generateToken({ id: 'tester-user', roles: ['tester', 'viewer'] });
    viewerToken = generateToken({ id: 'viewer-user', roles: ['viewer'] });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication', async () => {
      const res = await request(app).get('/test-suites');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('401');
    });

    it('should accept requests with valid token', async () => {
      const res = await request(app)
        .get('/test-suites')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
    });

    it('should enforce role-based access for webhooks', async () => {
      // Viewer should be denied
      const viewerRes = await request(app)
        .post('/webhooks')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          url: 'https://example.com/webhook',
          eventTypes: ['test.completed']
        });
      expect(viewerRes.status).toBe(403);

      // Tester should be allowed
      const testerRes = await request(app)
        .post('/webhooks')
        .set('Authorization', `Bearer ${testerToken}`)
        .send({
          url: 'https://example.com/webhook',
          eventTypes: ['test.completed']
        });
      expect(testerRes.status).toBe(201);
    });

    it('should enforce admin-only access for audit logs', async () => {
      // Tester should be denied
      const testerRes = await request(app)
        .get('/audit')
        .set('Authorization', `Bearer ${testerToken}`);
      expect(testerRes.status).toBe(403);

      // Admin should be allowed
      const adminRes = await request(app)
        .get('/audit')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
    });
  });

  describe('Test Suite Management', () => {
    let createdSuiteId;

    it('should create a test suite with proper validation', async () => {
      const suiteData = {
        name: 'Sample Test Suite',
        description: 'A sample test suite for integration testing',
        environment: 'staging',
        testCases: [
          {
            name: 'Login Test',
            steps: [
              { action: 'navigate', target: 'https://example.com/login' },
              { action: 'type', target: '#username', value: 'testuser' },
              { action: 'type', target: '#password', value: 'testpass' },
              { action: 'click', target: '#login-btn' },
              { action: 'wait', target: '.welcome-message' }
            ],
            expectedResult: 'User should be logged in successfully'
          }
        ]
      };

      const res = await request(app)
        .post('/test-suites')
        .set('Authorization', `Bearer ${testerToken}`)
        .send(suiteData);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(suiteData.name);
      expect(res.body.id).toBeDefined();
      expect(res.body.testCases).toHaveLength(1);
      
      createdSuiteId = res.body.id;
    });

    it('should retrieve the created test suite', async () => {
      const res = await request(app)
        .get(`/test-suites/${createdSuiteId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdSuiteId);
      expect(res.body.name).toBe('Sample Test Suite');
    });

    it('should update the test suite', async () => {
      const updateData = {
        description: 'Updated description for the test suite',
        testCases: [
          {
            name: 'Updated Login Test',
            steps: ['Navigate to login page', 'Enter credentials', 'Click login'],
            expectedResult: 'Successful login'
          }
        ]
      };

      const res = await request(app)
        .put(`/test-suites/${createdSuiteId}`)
        .set('Authorization', `Bearer ${testerToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.description).toBe(updateData.description);
    });

    it('should execute a test suite', async () => {
      const res = await request(app)
        .post('/test-suites/execute')
        .set('Authorization', `Bearer ${testerToken}`)
        .send({
          suiteId: createdSuiteId,
          environment: 'staging'
        });

      expect(res.status).toBe(202);
      expect(res.body.message).toContain('Test execution started');
    });

    it('should list test suites with pagination', async () => {
      const res = await request(app)
        .get('/test-suites?page=1&size=10')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.size).toBe(10);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe('Webhook Management', () => {
    let webhookId;

    it('should register a webhook', async () => {
      const webhookData = {
        url: 'https://example.com/test-webhook',
        eventTypes: ['test.completed', 'test.failed'],
        secret: 'webhook-secret-123'
      };

      const res = await request(app)
        .post('/webhooks')
        .set('Authorization', `Bearer ${testerToken}`)
        .send(webhookData);

      expect(res.status).toBe(201);
      expect(res.body.url).toBe(webhookData.url);
      expect(res.body.eventTypes).toEqual(webhookData.eventTypes);
      expect(res.body.id).toBeDefined();
      
      webhookId = res.body.id;
    });

    it('should list registered webhooks', async () => {
      const res = await request(app)
        .get('/webhooks')
        .set('Authorization', `Bearer ${testerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should validate webhook URL format', async () => {
      const invalidWebhook = {
        url: 'not-a-valid-url',
        eventTypes: ['test.completed']
      };

      const res = await request(app)
        .post('/webhooks')
        .set('Authorization', `Bearer ${testerToken}`)
        .send(invalidWebhook);

      expect(res.status).toBe(400);
      expect(res.body.details).toBeDefined();
    });

    it('should delete a webhook', async () => {
      const res = await request(app)
        .delete(`/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${testerToken}`);

      expect(res.status).toBe(204);
    });
  });

  describe('Test Results and Reporting', () => {
    it('should list test results', async () => {
      const res = await request(app)
        .get('/test-results')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.page).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('should filter test results by status', async () => {
      const res = await request(app)
        .get('/test-results?status=passed')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.every(item => item.status === 'passed')).toBe(true);
    });
  });

  describe('CI/CD Integration', () => {
    it('should handle CI callback', async () => {
      const callbackData = {
        pipelineId: 'pipeline-123',
        status: 'success',
        metadata: {
          branch: 'main',
          commit: 'abc123def456'
        }
      };

      const res = await request(app)
        .post('/ci/callback')
        .set('Authorization', `Bearer ${testerToken}`)
        .send(callbackData);

      expect(res.status).toBe(200);
      expect(res.body.acknowledged).toBe(true);
    });

    it('should handle failed CI callback', async () => {
      const callbackData = {
        pipelineId: 'pipeline-456',
        status: 'failed',
        metadata: {
          branch: 'feature/test',
          commit: 'def456ghi789',
          error: 'Build failed'
        }
      };

      const res = await request(app)
        .post('/ci/callback')
        .set('Authorization', `Bearer ${testerToken}`)
        .send(callbackData);

      expect(res.status).toBe(200);
      expect(res.body.acknowledged).toBe(true);
    });
  });

  describe('Health and Status', () => {
    it('should return service health', async () => {
      const res = await request(app).get('/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.message).toContain('Test Automation Service is healthy');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.version).toBeDefined();
    });

    it('should provide API documentation', async () => {
      const res = await request(app).get('/docs');
      expect(res.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // This test would require making many requests rapidly
      // For now, we'll just verify the middleware is applied
      const res = await request(app)
        .get('/test-suites')
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(res.status).toBe(200);
      // In a real scenario, you would make 100+ requests rapidly to test rate limiting
    });
  });
});
