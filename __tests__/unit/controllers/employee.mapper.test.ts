import { EmploymentType } from '@prisma/client';
import { ValidationError } from '@/errors/AppError.js';
import {
  mapEmployeeToResponse,
  mapRequestBodyToServiceData,
  mapUpdateBodyToServiceData,
  parseEmployeeRequestBody,
  parseListEmployeesQuery,
} from '@/controllers/employee.mapper.js';

const validBody = {
  fullName: 'Jane Doe',
  email: 'jane.doe@company.com',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  country: 'United States',
  salary: 120_000,
  employmentType: 'FULL_TIME',
  startDate: '2024-03-15',
};

describe('parseEmployeeRequestBody', () => {
  it('should parse a valid request body', () => {
    expect(parseEmployeeRequestBody(validBody)).toEqual({
      ...validBody,
      employmentType: EmploymentType.FULL_TIME,
    });
  });

  it('should throw when body is not an object', () => {
    expect(() => parseEmployeeRequestBody(null)).toThrow(
      new ValidationError('Request body is required'),
    );
  });

  it('should throw when a required field is empty', () => {
    expect(() =>
      parseEmployeeRequestBody({ ...validBody, fullName: '  ' }),
    ).toThrow(new ValidationError('fullName is required'));
  });

  it('should throw when salary is not a number', () => {
    expect(() =>
      parseEmployeeRequestBody({ ...validBody, salary: '120000' }),
    ).toThrow(new ValidationError('salary is required'));
  });

  it('should throw when salary is negative', () => {
    expect(() =>
      parseEmployeeRequestBody({ ...validBody, salary: -1 }),
    ).toThrow(
      new ValidationError('salary must be greater than or equal to 0'),
    );
  });

  it('should throw when employmentType is invalid', () => {
    expect(() =>
      parseEmployeeRequestBody({ ...validBody, employmentType: 'INTERN' }),
    ).toThrow(
      new ValidationError(
        'employmentType must be FULL_TIME, PART_TIME, or CONTRACT',
      ),
    );
  });

  it('should throw when startDate is empty', () => {
    expect(() =>
      parseEmployeeRequestBody({ ...validBody, startDate: '  ' }),
    ).toThrow(new ValidationError('startDate is required'));
  });

  it('should throw when startDate is invalid', () => {
    expect(() =>
      parseEmployeeRequestBody({ ...validBody, startDate: 'not-a-date' }),
    ).toThrow(new ValidationError('startDate must be a valid date'));
  });
});

describe('mapRequestBodyToServiceData', () => {
  it('should convert salary dollars to cents', () => {
    const parsed = parseEmployeeRequestBody(validBody);

    expect(mapRequestBodyToServiceData(parsed)).toEqual({
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

describe('mapUpdateBodyToServiceData', () => {
  it('should map update body the same as create body', () => {
    const parsed = parseEmployeeRequestBody(validBody);

    expect(mapUpdateBodyToServiceData(parsed)).toEqual(
      mapRequestBodyToServiceData(parsed),
    );
  });
});

describe('mapEmployeeToResponse', () => {
  it('should convert salary cents to dollars', () => {
    expect(
      mapEmployeeToResponse({
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
      }),
    ).toEqual({
      id: 'emp-1',
      fullName: 'Jane Doe',
      email: 'jane.doe@company.com',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      country: 'United States',
      salary: 120_000,
      employmentType: EmploymentType.FULL_TIME,
      startDate: '2024-03-15',
      createdAt: '2026-05-24T10:00:00.000Z',
      updatedAt: '2026-05-24T10:00:00.000Z',
    });
  });
});

describe('parseListEmployeesQuery', () => {
  it('should apply defaults for omitted query params', () => {
    expect(parseListEmployeesQuery({})).toEqual({
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

  it('should throw when an optional string query param is empty', () => {
    expect(() => parseListEmployeesQuery({ country: '  ' })).toThrow(
      new ValidationError('Query parameter must be a non-empty string'),
    );
  });

  it('should throw when page is not a positive integer', () => {
    expect(() => parseListEmployeesQuery({ page: 'abc' })).toThrow(
      new ValidationError('page must be a positive integer'),
    );
  });

  it('should throw when page is zero', () => {
    expect(() => parseListEmployeesQuery({ page: '0' })).toThrow(
      new ValidationError('page must be a positive integer'),
    );
  });

  it('should throw when limit exceeds 100', () => {
    expect(() => parseListEmployeesQuery({ limit: '101' })).toThrow(
      new ValidationError('limit must be between 1 and 100'),
    );
  });

  it('should throw when sortBy is invalid', () => {
    expect(() => parseListEmployeesQuery({ sortBy: 'invalid' })).toThrow(
      new ValidationError('sortBy is invalid'),
    );
  });

  it('should throw when sortOrder is invalid', () => {
    expect(() => parseListEmployeesQuery({ sortOrder: 'sideways' })).toThrow(
      new ValidationError('sortOrder must be asc or desc'),
    );
  });

  it('should throw when employmentType query param is invalid', () => {
    expect(() => parseListEmployeesQuery({ employmentType: 'INTERN' })).toThrow(
      new ValidationError(
        'employmentType must be FULL_TIME, PART_TIME, or CONTRACT',
      ),
    );
  });
});
