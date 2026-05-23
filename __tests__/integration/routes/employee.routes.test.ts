import { jest } from '@jest/globals';
import request from 'supertest';
import { Employee, EmploymentType } from '@prisma/client';
import { ConflictError, NotFoundError } from '@/errors/AppError.js';
import { createApp } from '@/app.js';
import {
  CreateEmployeeData,
  FindAllEmployeesParams,
  PaginatedEmployees,
  UpdateEmployeeData,
} from '@/repositories/employee.repository.js';
import { EmployeeServiceContract } from '@/services/employee.service.js';

interface MockEmployeeService extends EmployeeServiceContract {
  createEmployee: jest.MockedFunction<
    (data: CreateEmployeeData) => Promise<Employee>
  >;
  getEmployee: jest.MockedFunction<(id: string) => Promise<Employee>>;
  listEmployees: jest.MockedFunction<
    (params: FindAllEmployeesParams) => Promise<PaginatedEmployees>
  >;
  updateEmployee: jest.MockedFunction<
    (id: string, data: UpdateEmployeeData) => Promise<Employee>
  >;
  deleteEmployee: jest.MockedFunction<(id: string) => Promise<void>>;
}

function createMockEmployeeService(): MockEmployeeService {
  return {
    createEmployee: jest.fn(),
    getEmployee: jest.fn(),
    listEmployees: jest.fn(),
    updateEmployee: jest.fn(),
    deleteEmployee: jest.fn(),
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

function buildCreatePayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Jane Doe',
    email: 'jane.doe@company.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    country: 'United States',
    salary: 120_000,
    employmentType: 'FULL_TIME',
    startDate: '2024-03-15',
    ...overrides,
  };
}

function mapEmployeeToApiResponse(employee: Employee) {
  return {
    id: employee.id,
    fullName: employee.fullName,
    email: employee.email,
    jobTitle: employee.jobTitle,
    department: employee.department,
    country: employee.country,
    salary: employee.salaryCents / 100,
    employmentType: employee.employmentType,
    startDate: '2024-03-15',
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

describe('POST /api/employees', () => {
  let employeeService: MockEmployeeService;

  beforeEach(() => {
    employeeService = createMockEmployeeService();
  });

  it('should return 201 with the created employee', async () => {
    const employee = buildEmployee();
    employeeService.createEmployee.mockResolvedValue(employee);
    const app = createApp({ employeeService });

    const response = await request(app)
      .post('/api/employees')
      .send(buildCreatePayload());

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      data: mapEmployeeToApiResponse(employee),
    });
    expect(employeeService.createEmployee).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      email: 'jane.doe@company.com',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      country: 'United States',
      salaryCents: 120_000_00,
      employmentType: EmploymentType.FULL_TIME,
      startDate: new Date('2024-03-15T00:00:00.000Z'),
    });
  });

  it('should return 400 when required fields are missing', async () => {
    const app = createApp({ employeeService });

    const response = await request(app)
      .post('/api/employees')
      .send({ fullName: 'Jane Doe' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'email is required',
      },
    });
    expect(employeeService.createEmployee).not.toHaveBeenCalled();
  });

  it('should return 409 when email is already taken', async () => {
    employeeService.createEmployee.mockRejectedValue(
      new ConflictError("Employee with email 'jane.doe@company.com' already exists"),
    );
    const app = createApp({ employeeService });

    const response = await request(app)
      .post('/api/employees')
      .send(buildCreatePayload());

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'CONFLICT',
        message: "Employee with email 'jane.doe@company.com' already exists",
      },
    });
  });
});

describe('GET /api/employees', () => {
  let employeeService: MockEmployeeService;

  beforeEach(() => {
    employeeService = createMockEmployeeService();
  });

  it('should return 200 with a paginated response', async () => {
    const employee = buildEmployee();
    employeeService.listEmployees.mockResolvedValue({
      data: [employee],
      total: 1,
      page: 1,
      limit: 20,
    });
    const app = createApp({ employeeService });

    const response = await request(app).get('/api/employees');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [mapEmployeeToApiResponse(employee)],
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(employeeService.listEmployees).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      sortBy: 'fullName',
      sortOrder: 'asc',
      country: undefined,
      department: undefined,
      jobTitle: undefined,
      employmentType: undefined,
      search: undefined,
    });
  });

  it('should pass filters and pagination query params to the service', async () => {
    employeeService.listEmployees.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      limit: 10,
    });
    const app = createApp({ employeeService });

    const response = await request(app).get('/api/employees').query({
      page: '2',
      limit: '10',
      sortBy: 'salary',
      sortOrder: 'desc',
      country: 'Canada',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      employmentType: 'FULL_TIME',
      search: 'jane',
    });

    expect(response.status).toBe(200);
    expect(employeeService.listEmployees).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      sortBy: 'salary',
      sortOrder: 'desc',
      country: 'Canada',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      employmentType: EmploymentType.FULL_TIME,
      search: 'jane',
    });
  });

  it('should return 400 when query params are invalid', async () => {
    const app = createApp({ employeeService });

    const response = await request(app).get('/api/employees').query({
      page: 'abc',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'page must be a positive integer',
      },
    });
    expect(employeeService.listEmployees).not.toHaveBeenCalled();
  });
});

describe('GET /api/employees/:id', () => {
  let employeeService: MockEmployeeService;

  beforeEach(() => {
    employeeService = createMockEmployeeService();
  });

  it('should return 200 with the employee when found', async () => {
    const employee = buildEmployee();
    employeeService.getEmployee.mockResolvedValue(employee);
    const app = createApp({ employeeService });

    const response = await request(app).get('/api/employees/emp-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: mapEmployeeToApiResponse(employee) });
    expect(employeeService.getEmployee).toHaveBeenCalledWith('emp-1');
  });

  it('should return 404 when the employee is not found', async () => {
    employeeService.getEmployee.mockRejectedValue(
      new NotFoundError('Employee', 'missing-id'),
    );
    const app = createApp({ employeeService });

    const response = await request(app).get('/api/employees/missing-id');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: "Employee with id 'missing-id' not found",
      },
    });
  });
});

describe('PUT /api/employees/:id', () => {
  let employeeService: MockEmployeeService;

  beforeEach(() => {
    employeeService = createMockEmployeeService();
  });

  it('should return 200 with the updated employee', async () => {
    const employee = buildEmployee({ fullName: 'Jane Smith' });
    employeeService.updateEmployee.mockResolvedValue(employee);
    const app = createApp({ employeeService });

    const response = await request(app)
      .put('/api/employees/emp-1')
      .send(buildCreatePayload({ fullName: 'Jane Smith' }));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: mapEmployeeToApiResponse(employee) });
    expect(employeeService.updateEmployee).toHaveBeenCalledWith('emp-1', {
      fullName: 'Jane Smith',
      email: 'jane.doe@company.com',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      country: 'United States',
      salaryCents: 120_000_00,
      employmentType: EmploymentType.FULL_TIME,
      startDate: new Date('2024-03-15T00:00:00.000Z'),
    });
  });

  it('should return 404 when the employee is not found', async () => {
    employeeService.updateEmployee.mockRejectedValue(
      new NotFoundError('Employee', 'missing-id'),
    );
    const app = createApp({ employeeService });

    const response = await request(app)
      .put('/api/employees/missing-id')
      .send(buildCreatePayload());

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 409 when the new email is already taken', async () => {
    employeeService.updateEmployee.mockRejectedValue(
      new ConflictError("Employee with email 'taken@company.com' already exists"),
    );
    const app = createApp({ employeeService });

    const response = await request(app)
      .put('/api/employees/emp-1')
      .send(buildCreatePayload({ email: 'taken@company.com' }));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });
});

describe('DELETE /api/employees/:id', () => {
  let employeeService: MockEmployeeService;

  beforeEach(() => {
    employeeService = createMockEmployeeService();
  });

  it('should return 204 when the employee is deleted', async () => {
    employeeService.deleteEmployee.mockResolvedValue(undefined);
    const app = createApp({ employeeService });

    const response = await request(app).delete('/api/employees/emp-1');

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(employeeService.deleteEmployee).toHaveBeenCalledWith('emp-1');
  });

  it('should return 404 when the employee is not found', async () => {
    employeeService.deleteEmployee.mockRejectedValue(
      new NotFoundError('Employee', 'missing-id'),
    );
    const app = createApp({ employeeService });

    const response = await request(app).delete('/api/employees/missing-id');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
