import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { performance } from 'node:perf_hooks';
import { EmploymentType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const TOTAL_EMPLOYEES = 10_000;
const BATCH_SIZE = 500;
const FIRST_NAME_PRIME = 17;
const LAST_NAME_PRIME = 31;
const EMAIL_DOMAIN = 'company.com';

const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'Marketing',
  'Finance',
  'HR',
  'Operations',
  'Legal',
  'Product',
  'Design',
  'Customer Success',
] as const;

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Germany',
  'India',
  'Canada',
  'Australia',
  'France',
  'Brazil',
] as const;

type SalaryTier = 'junior' | 'mid' | 'senior' | 'manager';

interface JobTitleDefinition {
  title: string;
  department: (typeof DEPARTMENTS)[number];
  tier: SalaryTier;
}

const JOB_TITLES: JobTitleDefinition[] = [
  { title: 'Software Engineer', department: 'Engineering', tier: 'mid' },
  { title: 'Senior Software Engineer', department: 'Engineering', tier: 'senior' },
  { title: 'Engineering Manager', department: 'Engineering', tier: 'manager' },
  { title: 'Sales Representative', department: 'Sales', tier: 'junior' },
  { title: 'Account Executive', department: 'Sales', tier: 'mid' },
  { title: 'Sales Manager', department: 'Sales', tier: 'manager' },
  { title: 'Marketing Coordinator', department: 'Marketing', tier: 'junior' },
  { title: 'Marketing Specialist', department: 'Marketing', tier: 'mid' },
  { title: 'Marketing Manager', department: 'Marketing', tier: 'manager' },
  { title: 'Financial Analyst', department: 'Finance', tier: 'mid' },
  { title: 'Senior Financial Analyst', department: 'Finance', tier: 'senior' },
  { title: 'Finance Manager', department: 'Finance', tier: 'manager' },
  { title: 'HR Coordinator', department: 'HR', tier: 'junior' },
  { title: 'HR Business Partner', department: 'HR', tier: 'mid' },
  { title: 'HR Manager', department: 'HR', tier: 'manager' },
  { title: 'Operations Analyst', department: 'Operations', tier: 'mid' },
  { title: 'Operations Specialist', department: 'Operations', tier: 'mid' },
  { title: 'Operations Manager', department: 'Operations', tier: 'manager' },
  { title: 'Legal Analyst', department: 'Legal', tier: 'mid' },
  { title: 'Senior Counsel', department: 'Legal', tier: 'senior' },
  { title: 'Legal Manager', department: 'Legal', tier: 'manager' },
  { title: 'Product Analyst', department: 'Product', tier: 'junior' },
  { title: 'Product Manager', department: 'Product', tier: 'mid' },
  { title: 'Senior Product Manager', department: 'Product', tier: 'senior' },
  { title: 'UX Designer', department: 'Design', tier: 'mid' },
  { title: 'Senior UX Designer', department: 'Design', tier: 'senior' },
  { title: 'Design Manager', department: 'Design', tier: 'manager' },
  {
    title: 'Customer Success Associate',
    department: 'Customer Success',
    tier: 'junior',
  },
  {
    title: 'Customer Success Manager',
    department: 'Customer Success',
    tier: 'mid',
  },
  {
    title: 'Director of Customer Success',
    department: 'Customer Success',
    tier: 'manager',
  },
];

const SALARY_RANGES: Record<SalaryTier, { min: number; max: number }> = {
  junior: { min: 50_000_00, max: 80_000_00 },
  mid: { min: 80_000_00, max: 120_000_00 },
  senior: { min: 120_000_00, max: 180_000_00 },
  manager: { min: 140_000_00, max: 220_000_00 },
};

const START_DATE_BASE = new Date('2016-05-24T00:00:00.000Z');
const START_DATE_SPREAD_DAYS = 10 * 365;

function readNameFile(fileName: string): string[] {
  const filePath = join(__dirname, fileName);
  return readFileSync(filePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function pickByIndex<T>(items: readonly T[], index: number, prime: number): T {
  return items[(index * prime) % items.length] as T;
}

function normalizeNamePart(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function createDeterministicId(index: number): string {
  const hash = createHash('sha256')
    .update(`employee-seed-${index}`)
    .digest('hex');

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function pickEmploymentType(index: number): EmploymentType {
  const bucket = (index * 7) % 100;

  if (bucket < 80) {
    return EmploymentType.FULL_TIME;
  }

  if (bucket < 95) {
    return EmploymentType.PART_TIME;
  }

  return EmploymentType.CONTRACT;
}

function pickSalaryCents(index: number, tier: SalaryTier): number {
  const range = SALARY_RANGES[tier];
  const spread = range.max - range.min + 1;

  return range.min + ((index * 19) % spread);
}

function pickStartDate(index: number): Date {
  const dayOffset = (index * 13) % START_DATE_SPREAD_DAYS;
  const startDate = new Date(START_DATE_BASE);
  startDate.setUTCDate(startDate.getUTCDate() + dayOffset);

  return startDate;
}

function buildEmail(
  firstName: string,
  lastName: string,
  usedEmails: Set<string>,
): string {
  const base = `${normalizeNamePart(firstName)}.${normalizeNamePart(lastName)}`;
  let email = `${base}@${EMAIL_DOMAIN}`;
  let suffix = 2;

  while (usedEmails.has(email)) {
    email = `${base}${suffix}@${EMAIL_DOMAIN}`;
    suffix += 1;
  }

  usedEmails.add(email);
  return email;
}

function generateEmployees(
  firstNames: string[],
  lastNames: string[],
): Prisma.EmployeeCreateManyInput[] {
  const usedEmails = new Set<string>();
  const employees: Prisma.EmployeeCreateManyInput[] = [];

  for (let index = 0; index < TOTAL_EMPLOYEES; index += 1) {
    const firstName = pickByIndex(firstNames, index, FIRST_NAME_PRIME);
    const lastName = pickByIndex(lastNames, index, LAST_NAME_PRIME);
    const job = pickByIndex(JOB_TITLES, index, 23);
    const country = pickByIndex(COUNTRIES, index, 11);

    employees.push({
      id: createDeterministicId(index),
      fullName: `${firstName} ${lastName}`,
      email: buildEmail(firstName, lastName, usedEmails),
      jobTitle: job.title,
      department: job.department,
      country,
      salaryCents: pickSalaryCents(index, job.tier),
      employmentType: pickEmploymentType(index),
      startDate: pickStartDate(index),
    });

    if ((index + 1) % 1000 === 0) {
      process.stdout.write(`Generated ${index + 1}/${TOTAL_EMPLOYEES} records\n`);
    }
  }

  return employees;
}

async function seedEmployees(prisma: PrismaClient): Promise<void> {
  const firstNames = readNameFile('first_names.txt');
  const lastNames = readNameFile('last_names.txt');
  const employees = generateEmployees(firstNames, lastNames);

  await prisma.$transaction(async (transaction) => {
    await transaction.employee.deleteMany();

    for (let start = 0; start < employees.length; start += BATCH_SIZE) {
      const batch = employees.slice(start, start + BATCH_SIZE);
      await transaction.employee.createMany({ data: batch });

      const inserted = Math.min(start + batch.length, TOTAL_EMPLOYEES);
      if (inserted % 1000 === 0 || inserted === TOTAL_EMPLOYEES) {
        process.stdout.write(`Inserted ${inserted}/${TOTAL_EMPLOYEES} records\n`);
      }
    }
  });
}

async function main(): Promise<void> {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  });
  const prisma = new PrismaClient({ adapter });
  const startedAt = performance.now();

  try {
    await seedEmployees(prisma);
    const totalCount = await prisma.employee.count();
    const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);
    process.stdout.write(
      `Seed complete: ${totalCount} employees inserted in ${elapsedSeconds}s\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
