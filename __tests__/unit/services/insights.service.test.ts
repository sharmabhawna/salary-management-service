import { jest } from '@jest/globals';
import {
  CountryHeadcount,
  CountrySalaryStats,
  DepartmentSalaryStats,
} from '@/repositories/insights.repository.js';
import { InsightsService } from '@/services/insights.service.js';

interface MockInsightsRepository {
  getSalaryStatsByCountry: jest.MockedFunction<
    (country: string) => Promise<CountrySalaryStats | null>
  >;
  getAverageSalaryByJobTitleInCountry: jest.MockedFunction<
    (jobTitle: string, country: string) => Promise<number | null>
  >;
  getSalaryByDepartment: jest.MockedFunction<
    () => Promise<DepartmentSalaryStats[]>
  >;
  getHeadcountByCountry: jest.MockedFunction<
    () => Promise<CountryHeadcount[]>
  >;
}

function createMockInsightsRepository(): MockInsightsRepository {
  return {
    getSalaryStatsByCountry: jest.fn(),
    getAverageSalaryByJobTitleInCountry: jest.fn(),
    getSalaryByDepartment: jest.fn(),
    getHeadcountByCountry: jest.fn(),
  };
}

describe('InsightsService', () => {
  let repository: MockInsightsRepository;
  let service: InsightsService;

  beforeEach(() => {
    repository = createMockInsightsRepository();
    service = new InsightsService(repository);
  });

  describe('getSalaryStatsByCountry', () => {
    it('should convert salary cents to dollars', async () => {
      repository.getSalaryStatsByCountry.mockResolvedValue({
        minSalaryCents: 80_000_00,
        maxSalaryCents: 120_000_00,
        avgSalaryCents: 100_000_00,
      });

      const result = await service.getSalaryStatsByCountry('Canada');

      expect(result).toEqual({
        data: {
          country: 'Canada',
          min: 80_000,
          max: 120_000,
          average: 100_000,
        },
      });
    });

    it('should return data null with a message when no employees are found', async () => {
      repository.getSalaryStatsByCountry.mockResolvedValue(null);

      const result = await service.getSalaryStatsByCountry('Atlantis');

      expect(result).toEqual({
        data: null,
        message: 'No employees found in Atlantis',
      });
    });
  });

  describe('getAverageSalaryByJobTitleInCountry', () => {
    it('should convert salary cents to dollars', async () => {
      repository.getAverageSalaryByJobTitleInCountry.mockResolvedValue(
        135_000_00,
      );

      const result = await service.getAverageSalaryByJobTitleInCountry(
        'Software Engineer',
        'United States',
      );

      expect(result).toEqual({
        data: {
          country: 'United States',
          jobTitle: 'Software Engineer',
          average: 135_000,
        },
      });
    });

    it('should return data null with a message when no employees are found', async () => {
      repository.getAverageSalaryByJobTitleInCountry.mockResolvedValue(null);

      const result = await service.getAverageSalaryByJobTitleInCountry(
        'Software Engineer',
        'Atlantis',
      );

      expect(result).toEqual({
        data: null,
        message:
          "No employees found with job title 'Software Engineer' in Atlantis",
      });
    });
  });

  describe('getSalaryByDepartment', () => {
    it('should convert salary cents to dollars', async () => {
      repository.getSalaryByDepartment.mockResolvedValue([
        { department: 'Engineering', averageSalaryCents: 128_000_00 },
        { department: 'Sales', averageSalaryCents: 95_000_00 },
      ]);

      const result = await service.getSalaryByDepartment();

      expect(result).toEqual({
        data: [
          { department: 'Engineering', average: 128_000 },
          { department: 'Sales', average: 95_000 },
        ],
      });
    });

    it('should return an empty array when there is no data', async () => {
      repository.getSalaryByDepartment.mockResolvedValue([]);

      const result = await service.getSalaryByDepartment();

      expect(result).toEqual({ data: [] });
    });
  });

  describe('getHeadcountByCountry', () => {
    it('should return headcount data from the repository', async () => {
      repository.getHeadcountByCountry.mockResolvedValue([
        { country: 'United States', headcount: 3200 },
        { country: 'India', headcount: 2800 },
      ]);

      const result = await service.getHeadcountByCountry();

      expect(result).toEqual({
        data: [
          { country: 'United States', headcount: 3200 },
          { country: 'India', headcount: 2800 },
        ],
      });
    });

    it('should return an empty array when there is no data', async () => {
      repository.getHeadcountByCountry.mockResolvedValue([]);

      const result = await service.getHeadcountByCountry();

      expect(result).toEqual({ data: [] });
    });
  });
});
