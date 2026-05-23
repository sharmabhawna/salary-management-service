import { Employee, EmploymentType } from '@prisma/client';
import { ValidationError } from '@/errors/AppError.js';
import {
  CreateEmployeeData,
  EmployeeSortField,
  FindAllEmployeesParams,
  UpdateEmployeeData,
} from '@/repositories/employee.repository.js';

const EMPLOYMENT_TYPES = new Set<string>([
  EmploymentType.FULL_TIME,
  EmploymentType.PART_TIME,
  EmploymentType.CONTRACT,
]);

const SORT_FIELDS = new Set<string>([
  'fullName',
  'email',
  'jobTitle',
  'department',
  'country',
  'salary',
  'startDate',
  'createdAt',
]);

const SORT_ORDERS = new Set<string>(['asc', 'desc']);

const REQUIRED_BODY_FIELDS = [
  'fullName',
  'email',
  'jobTitle',
  'department',
  'country',
  'salary',
  'employmentType',
  'startDate',
] as const;

export interface EmployeeRequestBody {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  salary: number;
  employmentType: EmploymentType;
  startDate: string;
}

export interface EmployeeResponseBody {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  salary: number;
  employmentType: EmploymentType;
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseRequiredString(
  record: Record<string, unknown>,
  field: string,
): string {
  const value = record[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }

  return value.trim();
}

function parseSalary(record: Record<string, unknown>): number {
  const value = record.salary;

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError('salary is required');
  }

  if (value < 0) {
    throw new ValidationError('salary must be greater than or equal to 0');
  }

  return value;
}

function parseEmploymentType(record: Record<string, unknown>): EmploymentType {
  const value = record.employmentType;

  if (typeof value !== 'string' || !EMPLOYMENT_TYPES.has(value)) {
    throw new ValidationError(
      'employmentType must be FULL_TIME, PART_TIME, or CONTRACT',
    );
  }

  return value as EmploymentType;
}

function parseStartDate(record: Record<string, unknown>): Date {
  const value = record.startDate;

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError('startDate is required');
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError('startDate must be a valid date');
  }

  return date;
}

export function parseEmployeeRequestBody(body: unknown): EmployeeRequestBody {
  if (!isRecord(body)) {
    throw new ValidationError('Request body is required');
  }

  for (const field of REQUIRED_BODY_FIELDS) {
    if (body[field] === undefined) {
      throw new ValidationError(`${field} is required`);
    }
  }

  return {
    fullName: parseRequiredString(body, 'fullName'),
    email: parseRequiredString(body, 'email'),
    jobTitle: parseRequiredString(body, 'jobTitle'),
    department: parseRequiredString(body, 'department'),
    country: parseRequiredString(body, 'country'),
    salary: parseSalary(body),
    employmentType: parseEmploymentType(body),
    startDate: parseStartDate(body).toISOString().slice(0, 10),
  };
}

export function mapRequestBodyToServiceData(
  body: EmployeeRequestBody,
): CreateEmployeeData {
  return {
    fullName: body.fullName,
    email: body.email,
    jobTitle: body.jobTitle,
    department: body.department,
    country: body.country,
    salaryCents: Math.round(body.salary * 100),
    employmentType: body.employmentType,
    startDate: new Date(`${body.startDate}T00:00:00.000Z`),
  };
}

export function mapUpdateBodyToServiceData(
  body: EmployeeRequestBody,
): UpdateEmployeeData {
  return mapRequestBodyToServiceData(body);
}

export function mapEmployeeToResponse(employee: Employee): EmployeeResponseBody {
  return {
    id: employee.id,
    fullName: employee.fullName,
    email: employee.email,
    jobTitle: employee.jobTitle,
    department: employee.department,
    country: employee.country,
    salary: employee.salaryCents / 100,
    employmentType: employee.employmentType,
    startDate: employee.startDate.toISOString().slice(0, 10),
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

function parseOptionalString(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError('Query parameter must be a non-empty string');
  }

  return value.trim();
}

function parsePositiveInteger(
  value: unknown,
  field: string,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ValidationError(`${field} must be a positive integer`);
  }

  const parsed = Number.parseInt(value, 10);

  if (parsed < 1) {
    throw new ValidationError(`${field} must be a positive integer`);
  }

  return parsed;
}

function parseLimit(value: unknown): number {
  const limit = parsePositiveInteger(value, 'limit', 20);

  if (limit > 100) {
    throw new ValidationError('limit must be between 1 and 100');
  }

  return limit;
}

function parseSortBy(value: unknown): EmployeeSortField {
  if (value === undefined) {
    return 'fullName';
  }

  if (typeof value !== 'string' || !SORT_FIELDS.has(value)) {
    throw new ValidationError('sortBy is invalid');
  }

  return value as EmployeeSortField;
}

function parseSortOrder(value: unknown): 'asc' | 'desc' {
  if (value === undefined) {
    return 'asc';
  }

  if (typeof value !== 'string' || !SORT_ORDERS.has(value)) {
    throw new ValidationError('sortOrder must be asc or desc');
  }

  return value as 'asc' | 'desc';
}

function parseEmploymentTypeQuery(value: unknown): EmploymentType | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !EMPLOYMENT_TYPES.has(value)) {
    throw new ValidationError(
      'employmentType must be FULL_TIME, PART_TIME, or CONTRACT',
    );
  }

  return value as EmploymentType;
}

export function parseListEmployeesQuery(
  query: Record<string, unknown>,
): FindAllEmployeesParams {
  return {
    page: parsePositiveInteger(query.page, 'page', 1),
    limit: parseLimit(query.limit),
    sortBy: parseSortBy(query.sortBy),
    sortOrder: parseSortOrder(query.sortOrder),
    country: parseOptionalString(query.country),
    department: parseOptionalString(query.department),
    jobTitle: parseOptionalString(query.jobTitle),
    employmentType: parseEmploymentTypeQuery(query.employmentType),
    search: parseOptionalString(query.search),
  };
}
