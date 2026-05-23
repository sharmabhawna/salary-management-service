import { execSync } from 'node:child_process';
import { EmploymentType, PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { EmployeeRepository } from '@/repositories/employee.repository.js';
import { InsightsRepository } from '@/repositories/insights.repository.js';

const TEST_DATABASE_URL = 'file:./insights-test.db';

function createTestPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: TEST_DATABASE_URL });
  return new PrismaClient({ adapter });
}

function buildEmployeeData(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Jane Doe',
    email: 'jane.doe@company.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    country: 'United States',
    salaryCents: 120_000_00,
    employmentType: EmploymentType.FULL_TIME,
    startDate: new Date('2024-03-15T00:00:00.000Z'),
    ...overrides,
  };
}

async function seedEmployees(
  employeeRepository: EmployeeRepository,
  employees: Array<Record<string, unknown>>,
) {
  return Promise.all(
    employees.map((employee, index) =>
      employeeRepository.create(
        buildEmployeeData({
          email: `employee.${index}@company.com`,
          ...employee,
        }),
      ),
    ),
  );
}

describe('InsightsRepository', () => {
  let prisma: PrismaClient;
  let employeeRepository: EmployeeRepository;
  let repository: InsightsRepository;

  beforeAll(() => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
      },
      stdio: 'inherit',
    });
    prisma = createTestPrismaClient();
    employeeRepository = new EmployeeRepository(prisma);
    repository = new InsightsRepository(prisma);
  });

  afterEach(async () => {
    await prisma.employee.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getSalaryStatsByCountry', () => {
    it('should return min, max, and average salary cents for a country', async () => {
      await seedEmployees(employeeRepository, [
        { country: 'Canada', salaryCents: 80_000_00 },
        { country: 'Canada', salaryCents: 100_000_00 },
        { country: 'Canada', salaryCents: 120_000_00 },
        { country: 'United States', salaryCents: 200_000_00 },
      ]);

      const stats = await repository.getSalaryStatsByCountry('Canada');

      expect(stats).toEqual({
        minSalaryCents: 80_000_00,
        maxSalaryCents: 120_000_00,
        avgSalaryCents: 100_000_00,
      });
    });

    it('should return null when no employees exist in the country', async () => {
      const stats = await repository.getSalaryStatsByCountry('Atlantis');

      expect(stats).toBeNull();
    });
  });

  describe('getAverageSalaryByJobTitleInCountry', () => {
    it('should return the average salary cents for a job title in a country', async () => {
      await seedEmployees(employeeRepository, [
        {
          country: 'Canada',
          jobTitle: 'Software Engineer',
          salaryCents: 90_000_00,
        },
        {
          country: 'Canada',
          jobTitle: 'Software Engineer',
          salaryCents: 110_000_00,
        },
        {
          country: 'Canada',
          jobTitle: 'Product Manager',
          salaryCents: 130_000_00,
        },
      ]);

      const average = await repository.getAverageSalaryByJobTitleInCountry(
        'Software Engineer',
        'Canada',
      );

      expect(average).toBe(100_000_00);
    });

    it('should return null when no employees match the job title and country', async () => {
      const average = await repository.getAverageSalaryByJobTitleInCountry(
        'Software Engineer',
        'Atlantis',
      );

      expect(average).toBeNull();
    });
  });

  describe('getSalaryByDepartment', () => {
    it('should return average salary cents per department sorted by department', async () => {
      await seedEmployees(employeeRepository, [
        { department: 'Sales', salaryCents: 90_000_00 },
        { department: 'Engineering', salaryCents: 120_000_00 },
        { department: 'Engineering', salaryCents: 140_000_00 },
      ]);

      const stats = await repository.getSalaryByDepartment();

      expect(stats).toEqual([
        { department: 'Engineering', averageSalaryCents: 130_000_00 },
        { department: 'Sales', averageSalaryCents: 90_000_00 },
      ]);
    });

    it('should return an empty array when there are no employees', async () => {
      const stats = await repository.getSalaryByDepartment();

      expect(stats).toEqual([]);
    });
  });

  describe('getHeadcountByCountry', () => {
    it('should return headcount per country sorted by headcount descending', async () => {
      await seedEmployees(employeeRepository, [
        { country: 'United States' },
        { country: 'United States' },
        { country: 'Canada' },
        { country: 'India' },
        { country: 'India' },
        { country: 'India' },
      ]);

      const headcounts = await repository.getHeadcountByCountry();

      expect(headcounts).toEqual([
        { country: 'India', headcount: 3 },
        { country: 'United States', headcount: 2 },
        { country: 'Canada', headcount: 1 },
      ]);
    });

    it('should return an empty array when there are no employees', async () => {
      const headcounts = await repository.getHeadcountByCountry();

      expect(headcounts).toEqual([]);
    });
  });
});
