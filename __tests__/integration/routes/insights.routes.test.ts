import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '@/app.js';
import { InsightsServiceContract } from '@/services/insights.service.js';

interface MockInsightsService extends InsightsServiceContract {
  getSalaryStatsByCountry: jest.MockedFunction<
    InsightsServiceContract['getSalaryStatsByCountry']
  >;
  getAverageSalaryByJobTitleInCountry: jest.MockedFunction<
    InsightsServiceContract['getAverageSalaryByJobTitleInCountry']
  >;
  getSalaryByDepartment: jest.MockedFunction<
    InsightsServiceContract['getSalaryByDepartment']
  >;
  getHeadcountByCountry: jest.MockedFunction<
    InsightsServiceContract['getHeadcountByCountry']
  >;
}

function createMockInsightsService(): MockInsightsService {
  return {
    getSalaryStatsByCountry: jest.fn(),
    getAverageSalaryByJobTitleInCountry: jest.fn(),
    getSalaryByDepartment: jest.fn(),
    getHeadcountByCountry: jest.fn(),
  };
}

describe('GET /api/insights/salary/country', () => {
  let insightsService: MockInsightsService;

  beforeEach(() => {
    insightsService = createMockInsightsService();
  });

  it('should return 200 with salary stats for a country', async () => {
    insightsService.getSalaryStatsByCountry.mockResolvedValue({
      data: {
        country: 'United States',
        min: 45_000,
        max: 250_000,
        average: 98_500,
      },
    });
    const app = createApp({ insightsService });

    const response = await request(app)
      .get('/api/insights/salary/country')
      .query({ country: 'United States' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        country: 'United States',
        min: 45_000,
        max: 250_000,
        average: 98_500,
      },
    });
    expect(insightsService.getSalaryStatsByCountry).toHaveBeenCalledWith(
      'United States',
    );
  });

  it('should return 200 with an empty result message', async () => {
    insightsService.getSalaryStatsByCountry.mockResolvedValue({
      data: null,
      message: 'No employees found in Atlantis',
    });
    const app = createApp({ insightsService });

    const response = await request(app)
      .get('/api/insights/salary/country')
      .query({ country: 'Atlantis' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: null,
      message: 'No employees found in Atlantis',
    });
  });

  it('should return 400 when country is empty', async () => {
    const app = createApp({ insightsService });

    const response = await request(app)
      .get('/api/insights/salary/country')
      .query({ country: '  ' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('country is required');
  });
});

describe('GET /api/insights/salary/job-title', () => {
  let insightsService: MockInsightsService;

  beforeEach(() => {
    insightsService = createMockInsightsService();
  });

  it('should return 200 with average salary for a job title in a country', async () => {
    insightsService.getAverageSalaryByJobTitleInCountry.mockResolvedValue({
      data: {
        country: 'United States',
        jobTitle: 'Software Engineer',
        average: 135_000,
      },
    });
    const app = createApp({ insightsService });

    const response = await request(app)
      .get('/api/insights/salary/job-title')
      .query({ country: 'United States', jobTitle: 'Software Engineer' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        country: 'United States',
        jobTitle: 'Software Engineer',
        average: 135_000,
      },
    });
    expect(
      insightsService.getAverageSalaryByJobTitleInCountry,
    ).toHaveBeenCalledWith('Software Engineer', 'United States');
  });

  it('should return 200 with an empty result message', async () => {
    insightsService.getAverageSalaryByJobTitleInCountry.mockResolvedValue({
      data: null,
      message:
        "No employees found with job title 'Software Engineer' in Atlantis",
    });
    const app = createApp({ insightsService });

    const response = await request(app)
      .get('/api/insights/salary/job-title')
      .query({ country: 'Atlantis', jobTitle: 'Software Engineer' });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.message).toContain('Atlantis');
  });

  it('should return 400 when required query params are missing', async () => {
    const app = createApp({ insightsService });

    const response = await request(app)
      .get('/api/insights/salary/job-title')
      .query({ country: 'United States' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(
      insightsService.getAverageSalaryByJobTitleInCountry,
    ).not.toHaveBeenCalled();
  });
});

describe('GET /api/insights/salary/department', () => {
  let insightsService: MockInsightsService;

  beforeEach(() => {
    insightsService = createMockInsightsService();
  });

  it('should return 200 with average salary per department', async () => {
    insightsService.getSalaryByDepartment.mockResolvedValue({
      data: [
        { department: 'Engineering', average: 128_000 },
        { department: 'Sales', average: 95_000 },
      ],
    });
    const app = createApp({ insightsService });

    const response = await request(app).get('/api/insights/salary/department');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        { department: 'Engineering', average: 128_000 },
        { department: 'Sales', average: 95_000 },
      ],
    });
  });

  it('should return 200 with an empty array when there is no data', async () => {
    insightsService.getSalaryByDepartment.mockResolvedValue({ data: [] });
    const app = createApp({ insightsService });

    const response = await request(app).get('/api/insights/salary/department');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it('should pass service errors to the error handler', async () => {
    insightsService.getSalaryByDepartment.mockRejectedValue(new Error('boom'));
    const app = createApp({ insightsService });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await request(app).get('/api/insights/salary/department');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('GET /api/insights/headcount/country', () => {
  let insightsService: MockInsightsService;

  beforeEach(() => {
    insightsService = createMockInsightsService();
  });

  it('should return 200 with headcount per country', async () => {
    insightsService.getHeadcountByCountry.mockResolvedValue({
      data: [
        { country: 'United States', headcount: 3200 },
        { country: 'India', headcount: 2800 },
      ],
    });
    const app = createApp({ insightsService });

    const response = await request(app).get('/api/insights/headcount/country');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        { country: 'United States', headcount: 3200 },
        { country: 'India', headcount: 2800 },
      ],
    });
  });

  it('should return 200 with an empty array when there is no data', async () => {
    insightsService.getHeadcountByCountry.mockResolvedValue({ data: [] });
    const app = createApp({ insightsService });

    const response = await request(app).get('/api/insights/headcount/country');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it('should pass service errors to the error handler', async () => {
    insightsService.getHeadcountByCountry.mockRejectedValue(new Error('boom'));
    const app = createApp({ insightsService });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await request(app).get('/api/insights/headcount/country');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
