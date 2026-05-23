import { Employee } from '@prisma/client';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/errors/AppError.js';
import {
  CreateEmployeeData,
  FindAllEmployeesParams,
  PaginatedEmployees,
  UpdateEmployeeData,
} from '@/repositories/employee.repository.js';

export interface EmployeeRepositoryContract {
  create(data: CreateEmployeeData): Promise<Employee>;
  findById(id: string): Promise<Employee | null>;
  findAll(params: FindAllEmployeesParams): Promise<PaginatedEmployees>;
  update(id: string, data: UpdateEmployeeData): Promise<Employee>;
  delete(id: string): Promise<void>;
}

export interface EmployeeServiceContract {
  createEmployee(data: CreateEmployeeData): Promise<Employee>;
  getEmployee(id: string): Promise<Employee>;
  listEmployees(params: FindAllEmployeesParams): Promise<PaginatedEmployees>;
  updateEmployee(id: string, data: UpdateEmployeeData): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
}

const REQUIRED_STRING_FIELDS = [
  'fullName',
  'email',
  'jobTitle',
  'department',
  'country',
] as const;

export class EmployeeService implements EmployeeServiceContract {
  constructor(
    private readonly employeeRepository: EmployeeRepositoryContract,
  ) {}

  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    this.validateEmployeeData(data);
    await this.ensureEmailAvailable(data.email);
    return this.employeeRepository.create(data);
  }

  async getEmployee(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);

    if (employee === null) {
      throw new NotFoundError('Employee', id);
    }

    return employee;
  }

  async listEmployees(
    params: FindAllEmployeesParams,
  ): Promise<PaginatedEmployees> {
    return this.employeeRepository.findAll(params);
  }

  async updateEmployee(
    id: string,
    data: UpdateEmployeeData,
  ): Promise<Employee> {
    this.validateEmployeeData(data);
    const existing = await this.getEmployee(id);

    if (data.email !== existing.email) {
      await this.ensureEmailAvailable(data.email, id);
    }

    return this.employeeRepository.update(id, data);
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.getEmployee(id);
    await this.employeeRepository.delete(id);
  }

  private validateEmployeeData(data: CreateEmployeeData): void {
    for (const field of REQUIRED_STRING_FIELDS) {
      if (data[field].trim().length === 0) {
        throw new ValidationError(`${field} is required`);
      }
    }

    if (data.employmentType === undefined) {
      throw new ValidationError('employmentType is required');
    }

    if (data.startDate === undefined) {
      throw new ValidationError('startDate is required');
    }

    if (data.salaryCents < 0) {
      throw new ValidationError('salaryCents must be greater than or equal to 0');
    }
  }

  private async ensureEmailAvailable(
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const result = await this.employeeRepository.findAll({
      page: 1,
      limit: 1,
      search: email,
    });

    const duplicate = result.data.find(
      (employee) =>
        employee.email === email &&
        (excludeId === undefined || employee.id !== excludeId),
    );

    if (duplicate !== undefined) {
      throw new ConflictError(`Employee with email '${email}' already exists`);
    }
  }
}
