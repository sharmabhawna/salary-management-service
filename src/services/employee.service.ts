import { Employee } from '@prisma/client';
import { ConflictError } from '@/errors/AppError.js';
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

export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepositoryContract,
  ) {}

  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    await this.ensureEmailAvailable(data.email);
    return this.employeeRepository.create(data);
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
