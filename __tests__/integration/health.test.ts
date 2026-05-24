import request from 'supertest';
import { createApp } from '@/app.js';

const app = createApp();

describe('GET /health', () => {
  it('should return 200 with status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('CORS configuration', () => {
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  afterEach(() => {
    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = originalCorsOrigin;
    }
  });

  it('should allow all origins when CORS_ORIGIN is not set', async () => {
    delete process.env.CORS_ORIGIN;
    const appUnrestricted = createApp();
    const response = await request(appUnrestricted)
      .get('/health')
      .set('Origin', 'http://any-origin.example.com');

    expect(response.status).toBe(200);
  });

  it('should restrict to configured origin when CORS_ORIGIN is set', async () => {
    process.env.CORS_ORIGIN = 'https://my-portal.vercel.app';
    const appRestricted = createApp();
    const response = await request(appRestricted)
      .get('/health')
      .set('Origin', 'https://my-portal.vercel.app');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://my-portal.vercel.app',
    );
  });
});