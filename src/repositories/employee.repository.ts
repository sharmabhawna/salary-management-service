import { Employee, EmploymentType, PrismaClient } from '@prisma/client';

export interface CreateEmployeeData {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  salaryCents: number;
  employmentType: EmploymentType;
  startDate: Date;
}

export class EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateEmployeeData): Promise<Employee> {
    return this.prisma.employee.create({ data });
  }

  async findById(id: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({ where: { id } });
  }
}
