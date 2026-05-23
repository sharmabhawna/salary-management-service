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

async function seedEmployees(
  repository: EmployeeRepository,
  employees: Array<Record<string, unknown>>,
) {
  return Promise.all(employees.map((employee) => repository.create(buildEmployeeData(employee))));
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

  describe('findAll', () => {
    it('should return page 1 of results with correct pagination metadata', async () => {
      await seedEmployees(repository, [
        { fullName: 'Alice Adams', email: 'alice.adams@company.com' },
        { fullName: 'Bob Brown', email: 'bob.brown@company.com' },
        { fullName: 'Carol Clark', email: 'carol.clark@company.com' },
      ]);

      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data.map((employee) => employee.fullName)).toEqual([
        'Alice Adams',
        'Bob Brown',
      ]);
    });

    it('should return page 2 of results', async () => {
      await seedEmployees(repository, [
        { fullName: 'Alice Adams', email: 'alice.adams@company.com' },
        { fullName: 'Bob Brown', email: 'bob.brown@company.com' },
        { fullName: 'Carol Clark', email: 'carol.clark@company.com' },
      ]);

      const result = await repository.findAll({ page: 2, limit: 2 });

      expect(result.total).toBe(3);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.fullName).toBe('Carol Clark');
    });

    it('should filter by country', async () => {
      await seedEmployees(repository, [
        { email: 'alice.adams@company.com', country: 'United States' },
        { email: 'bob.brown@company.com', country: 'Canada' },
      ]);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        country: 'Canada',
      });

      expect(result.total).toBe(1);
      expect(result.data[0]?.country).toBe('Canada');
    });

    it('should filter by department', async () => {
      await seedEmployees(repository, [
        { email: 'alice.adams@company.com', department: 'Engineering' },
        { email: 'bob.brown@company.com', department: 'Sales' },
      ]);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        department: 'Sales',
      });

      expect(result.total).toBe(1);
      expect(result.data[0]?.department).toBe('Sales');
    });

    it('should filter by jobTitle', async () => {
      await seedEmployees(repository, [
        { email: 'alice.adams@company.com', jobTitle: 'Software Engineer' },
        { email: 'bob.brown@company.com', jobTitle: 'Product Manager' },
      ]);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        jobTitle: 'Product Manager',
      });

      expect(result.total).toBe(1);
      expect(result.data[0]?.jobTitle).toBe('Product Manager');
    });

    it('should filter by employmentType', async () => {
      await seedEmployees(repository, [
        {
          email: 'alice.adams@company.com',
          employmentType: EmploymentType.FULL_TIME,
        },
        {
          email: 'bob.brown@company.com',
          employmentType: EmploymentType.CONTRACT,
        },
      ]);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        employmentType: EmploymentType.CONTRACT,
      });

      expect(result.total).toBe(1);
      expect(result.data[0]?.employmentType).toBe(EmploymentType.CONTRACT);
    });

    it('should search by fullName case-insensitively', async () => {
      await seedEmployees(repository, [
        { fullName: 'Alice Adams', email: 'alice.adams@company.com' },
        { fullName: 'Bob Brown', email: 'bob.brown@company.com' },
      ]);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        search: 'alice',
      });

      expect(result.total).toBe(1);
      expect(result.data[0]?.fullName).toBe('Alice Adams');
    });

    it('should search by email case-insensitively', async () => {
      await seedEmployees(repository, [
        { fullName: 'Alice Adams', email: 'alice.adams@company.com' },
        { fullName: 'Bob Brown', email: 'bob.brown@company.com' },
      ]);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        search: 'BOB.BROWN',
      });

      expect(result.total).toBe(1);
      expect(result.data[0]?.email).toBe('bob.brown@company.com');
    });

    it('should sort by salary ascending', async () => {
      await seedEmployees(repository, [
        {
          fullName: 'High Earner',
          email: 'high.earner@company.com',
          salaryCents: 200_000_00,
        },
        {
          fullName: 'Low Earner',
          email: 'low.earner@company.com',
          salaryCents: 50_000_00,
        },
      ]);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        sortBy: 'salary',
        sortOrder: 'asc',
      });

      expect(result.data.map((employee) => employee.fullName)).toEqual([
        'Low Earner',
        'High Earner',
      ]);
    });

    it('should sort by salary descending', async () => {
      await seedEmployees(repository, [
        {
          fullName: 'High Earner',
          email: 'high.earner@company.com',
          salaryCents: 200_000_00,
        },
        {
          fullName: 'Low Earner',
          email: 'low.earner@company.com',
          salaryCents: 50_000_00,
        },
      ]);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        sortBy: 'salary',
        sortOrder: 'desc',
      });

      expect(result.data.map((employee) => employee.fullName)).toEqual([
        'High Earner',
        'Low Earner',
      ]);
    });
  });

  describe('update', () => {
    it('should update and return the employee', async () => {
      const created = await repository.create(buildEmployeeData());
      const updateData = buildEmployeeData({
        fullName: 'Jane Smith',
        email: 'jane.smith@company.com',
        jobTitle: 'Senior Software Engineer',
        department: 'Platform',
        country: 'Canada',
        salaryCents: 150_000_00,
        employmentType: EmploymentType.PART_TIME,
        startDate: new Date('2025-01-01T00:00:00.000Z'),
      });

      const updated = await repository.update(created.id, updateData);

      expect(updated.id).toBe(created.id);
      expect(updated.fullName).toBe(updateData.fullName);
      expect(updated.email).toBe(updateData.email);
      expect(updated.jobTitle).toBe(updateData.jobTitle);
      expect(updated.department).toBe(updateData.department);
      expect(updated.country).toBe(updateData.country);
      expect(updated.salaryCents).toBe(updateData.salaryCents);
      expect(updated.employmentType).toBe(updateData.employmentType);
      expect(updated.startDate).toEqual(updateData.startDate);
      expect(updated.createdAt).toEqual(created.createdAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime(),
      );
    });
  });

  describe('delete', () => {
    it('should delete the employee', async () => {
      const created = await repository.create(buildEmployeeData());

      await repository.delete(created.id);

      const employee = await repository.findById(created.id);
      expect(employee).toBeNull();
    });
  });
});
