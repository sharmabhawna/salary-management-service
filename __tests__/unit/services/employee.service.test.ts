import { jest } from '@jest/globals';
import { Employee, EmploymentType } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/errors/AppError.js';
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

    it.each([
      ['fullName', { fullName: '' }],
      ['email', { email: '' }],
      ['jobTitle', { jobTitle: '' }],
      ['department', { department: '' }],
      ['country', { country: '' }],
      ['employmentType', { employmentType: undefined }],
      ['startDate', { startDate: undefined }],
    ] as const)(
      'should throw ValidationError when %s is missing',
      async (_field, overrides) => {
        const data = buildCreateData(overrides);

        await expect(service.createEmployee(data)).rejects.toBeInstanceOf(
          ValidationError,
        );
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it('should throw ValidationError when salaryCents is negative', async () => {
      const data = buildCreateData({ salaryCents: -1 });

      await expect(service.createEmployee(data)).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'salaryCents must be greater than or equal to 0',
      });
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('getEmployee', () => {
    it('should return the employee when found', async () => {
      const employee = buildEmployee();
      repository.findById.mockResolvedValue(employee);

      const result = await service.getEmployee(employee.id);

      expect(result).toEqual(employee);
      expect(repository.findById).toHaveBeenCalledWith(employee.id);
    });

    it('should throw NotFoundError when the employee does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getEmployee('missing-id')).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(service.getEmployee('missing-id')).rejects.toMatchObject({
        message: "Employee with id 'missing-id' not found",
      });
    });
  });

  describe('listEmployees', () => {
    it('should delegate to the repository with the provided params', async () => {
      const params: FindAllEmployeesParams = {
        page: 2,
        limit: 25,
        sortBy: 'salary',
        sortOrder: 'desc',
        country: 'Canada',
        department: 'Engineering',
        jobTitle: 'Software Engineer',
        employmentType: EmploymentType.FULL_TIME,
        search: 'jane',
      };
      const paginated = {
        data: [buildEmployee()],
        total: 1,
        page: 2,
        limit: 25,
      };
      repository.findAll.mockResolvedValue(paginated);

      const result = await service.listEmployees(params);

      expect(result).toEqual(paginated);
      expect(repository.findAll).toHaveBeenCalledWith(params);
    });
  });

  describe('updateEmployee', () => {
    it('should return the updated employee', async () => {
      const existing = buildEmployee();
      const updateData = buildCreateData({
        fullName: 'Jane Smith',
        email: 'jane.smith@company.com',
      });
      const updated = buildEmployee({
        fullName: updateData.fullName,
        email: updateData.email,
      });
      repository.findById.mockResolvedValue(existing);
      repository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1,
      });
      repository.update.mockResolvedValue(updated);

      const result = await service.updateEmployee(existing.id, updateData);

      expect(result).toEqual(updated);
      expect(repository.findById).toHaveBeenCalledWith(existing.id);
      expect(repository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 1,
        search: updateData.email,
      });
      expect(repository.update).toHaveBeenCalledWith(existing.id, updateData);
    });

    it('should throw NotFoundError when the employee does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateEmployee('missing-id', buildCreateData()),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when the new email belongs to another employee', async () => {
      const existing = buildEmployee({ id: 'emp-1', email: 'jane.doe@company.com' });
      const updateData = buildCreateData({ email: 'taken@company.com' });
      const otherEmployee = buildEmployee({
        id: 'emp-2',
        email: 'taken@company.com',
      });
      repository.findById.mockResolvedValue(existing);
      repository.findAll.mockResolvedValue({
        data: [otherEmployee],
        total: 1,
        page: 1,
        limit: 1,
      });

      await expect(
        service.updateEmployee(existing.id, updateData),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should allow keeping the same email for the same employee', async () => {
      const existing = buildEmployee();
      const updateData = buildCreateData({ fullName: 'Jane Smith' });
      const updated = buildEmployee({ fullName: 'Jane Smith' });
      repository.findById.mockResolvedValue(existing);
      repository.findAll.mockResolvedValue({
        data: [existing],
        total: 1,
        page: 1,
        limit: 1,
      });
      repository.update.mockResolvedValue(updated);

      const result = await service.updateEmployee(existing.id, updateData);

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(existing.id, updateData);
    });
  });

  describe('deleteEmployee', () => {
    it('should delete the employee when it exists', async () => {
      const existing = buildEmployee();
      repository.findById.mockResolvedValue(existing);
      repository.delete.mockResolvedValue(undefined);

      await service.deleteEmployee(existing.id);

      expect(repository.findById).toHaveBeenCalledWith(existing.id);
      expect(repository.delete).toHaveBeenCalledWith(existing.id);
    });

    it('should throw NotFoundError when the employee does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteEmployee('missing-id')).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
