import {
  Employee,
  EmploymentType,
  Prisma,
  PrismaClient,
} from '@prisma/client';

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

export type UpdateEmployeeData = CreateEmployeeData;

export type EmployeeSortField =
  | 'fullName'
  | 'email'
  | 'jobTitle'
  | 'department'
  | 'country'
  | 'salary'
  | 'startDate'
  | 'createdAt';

export interface FindAllEmployeesParams {
  page: number;
  limit: number;
  sortBy?: EmployeeSortField;
  sortOrder?: 'asc' | 'desc';
  country?: string;
  department?: string;
  jobTitle?: string;
  employmentType?: EmploymentType;
  search?: string;
}

export interface PaginatedEmployees {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
}

const SORT_FIELD_MAP: Record<EmployeeSortField, keyof Employee> = {
  fullName: 'fullName',
  email: 'email',
  jobTitle: 'jobTitle',
  department: 'department',
  country: 'country',
  salary: 'salaryCents',
  startDate: 'startDate',
  createdAt: 'createdAt',
};

function buildWhereClause(
  params: FindAllEmployeesParams,
): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};

  if (params.country !== undefined) {
    where.country = params.country;
  }

  if (params.department !== undefined) {
    where.department = params.department;
  }

  if (params.jobTitle !== undefined) {
    where.jobTitle = params.jobTitle;
  }

  if (params.employmentType !== undefined) {
    where.employmentType = params.employmentType;
  }

  if (params.search !== undefined) {
    where.OR = [
      { fullName: { contains: params.search } },
      { email: { contains: params.search } },
    ];
  }

  return where;
}

export class EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateEmployeeData): Promise<Employee> {
    return this.prisma.employee.create({ data });
  }

  async findById(id: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({ where: { id } });
  }

  async findAll(params: FindAllEmployeesParams): Promise<PaginatedEmployees> {
    const where = buildWhereClause(params);
    const sortBy = params.sortBy ?? 'fullName';
    const sortOrder = params.sortOrder ?? 'asc';
    const sortField = SORT_FIELD_MAP[sortBy];
    const skip = (params.page - 1) * params.limit;

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data,
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async update(id: string, data: UpdateEmployeeData): Promise<Employee> {
    return this.prisma.employee.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.employee.delete({ where: { id } });
  }
}
