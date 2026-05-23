import { jest } from '@jest/globals';
import { Employee, EmploymentType } from '@prisma/client';
import {
  CreateEmployeeData,
  FindAllEmployeesParams,
  PaginatedEmployees,
  UpdateEmployeeData,
} from '@/repositories/employee.repository.js';
import { EmployeeService } from '@/services/employee.service.js';

interface MockEmployeeRepository {
  create: jest.MockedFunction<(data: CreateEmployeeData) => Promise<Employee>>;
  findById: jest.MockedFunction<(id: string) => Promise<Employee | null>>;
  findAll: jest.MockedFunction<
    (params: FindAllEmployeesParams) => Promise<PaginatedEmployees>
  >;
  update: jest.MockedFunction<
    (id: string, data: UpdateEmployeeData) => Promise<Employee>
  >;
  delete: jest.MockedFunction<(id: string) => Promise<void>>;
}

function createMockRepository(): MockEmployeeRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

function buildEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    fullName: 'Jane Doe',
    email: 'jane.doe@company.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    country: 'United States',
    salaryCents: 120_000_00,
    employmentType: EmploymentType.FULL_TIME,
    startDate: new Date('2024-03-15T00:00:00.000Z'),
    createdAt: new Date('2026-05-24T10:00:00.000Z'),
    updatedAt: new Date('2026-05-24T10:00:00.000Z'),
    ...overrides,
  };
}

function buildCreateData(
  overrides: Partial<CreateEmployeeData> = {},
): CreateEmployeeData {
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

describe('EmployeeService', () => {
  let repository: MockEmployeeRepository;
  let service: EmployeeService;

  beforeEach(() => {
    repository = createMockRepository();
    service = new EmployeeService(repository);
  });

  describe('createEmployee', () => {
    it('should create and return an employee', async () => {
      const data = buildCreateData();
      const employee = buildEmployee();
      repository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1,
      });
      repository.create.mockResolvedValue(employee);

      const result = await service.createEmployee(data);

      expect(result).toEqual(employee);
      expect(repository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 1,
        search: data.email,
      });
      expect(repository.create).toHaveBeenCalledWith(data);
    });

    it('should throw ConflictError when email is already taken', async () => {
      const data = buildCreateData();
      const existing = buildEmployee({ email: data.email });
      repository.findAll.mockResolvedValue({
        data: [existing],
        total: 1,
        page: 1,
        limit: 1,
      });

      await expect(service.createEmployee(data)).rejects.toMatchObject({
        name: 'ConflictError',
        statusCode: 409,
        code: 'CONFLICT',
        message: `Employee with email '${data.email}' already exists`,
      });
      expect(repository.create).not.toHaveBeenCalled();
    });
  });
});
