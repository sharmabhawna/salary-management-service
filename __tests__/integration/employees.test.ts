import { jest } from '@jest/globals';
import request from 'supertest';
import { Employee, EmploymentType } from '@prisma/client';
import { ConflictError, ValidationError } from '@/errors/AppError.js';
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
      data: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        jobTitle: employee.jobTitle,
        department: employee.department,
        country: employee.country,
        salary: 120_000,
        employmentType: employee.employmentType,
        startDate: '2024-03-15',
        createdAt: employee.createdAt.toISOString(),
        updatedAt: employee.updatedAt.toISOString(),
      },
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
});
