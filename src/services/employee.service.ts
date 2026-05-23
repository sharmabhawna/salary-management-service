import { Employee } from '@prisma/client';
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
    return this.employeeRepository.create(data);
  }
}
