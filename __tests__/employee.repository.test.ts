import { execSync } from 'node:child_process';
import { EmploymentType, PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { EmployeeRepository } from '@/repositories/employee.repository.js';

const TEST_DATABASE_URL = 'file:./test.db';

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

describe('EmployeeRepository', () => {
  let prisma: PrismaClient;
  let repository: EmployeeRepository;

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
    repository = new EmployeeRepository(prisma);
  });

  afterEach(async () => {
    await prisma.employee.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create and return an employee', async () => {
      const data = buildEmployeeData();

      const employee = await repository.create(data);

      expect(employee.id).toEqual(expect.any(String));
      expect(employee.fullName).toBe(data.fullName);
      expect(employee.email).toBe(data.email);
      expect(employee.jobTitle).toBe(data.jobTitle);
      expect(employee.department).toBe(data.department);
      expect(employee.country).toBe(data.country);
      expect(employee.salaryCents).toBe(data.salaryCents);
      expect(employee.employmentType).toBe(data.employmentType);
      expect(employee.startDate).toEqual(data.startDate);
      expect(employee.createdAt).toBeInstanceOf(Date);
      expect(employee.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('should return the employee when found', async () => {
      const created = await repository.create(buildEmployeeData());

      const employee = await repository.findById(created.id);

      expect(employee).toEqual(created);
    });

    it('should return null when the employee is not found', async () => {
      const employee = await repository.findById('non-existent-id');

      expect(employee).toBeNull();
    });
  });
});
