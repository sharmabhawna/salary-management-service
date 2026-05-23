import { PrismaClient } from '@prisma/client';

export interface CountrySalaryStats {
  minSalaryCents: number;
  maxSalaryCents: number;
  avgSalaryCents: number;
}

export interface DepartmentSalaryStats {
  department: string;
  averageSalaryCents: number;
}

export interface CountryHeadcount {
  country: string;
  headcount: number;
}

export class InsightsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSalaryStatsByCountry(
    country: string,
  ): Promise<CountrySalaryStats | null> {
    const stats = await this.prisma.employee.aggregate({
      where: { country },
      _min: { salaryCents: true },
      _max: { salaryCents: true },
      _avg: { salaryCents: true },
      _count: true,
    });

    if (stats._count === 0) {
      return null;
    }

    // Non-null when count > 0 because salaryCents is a required field
    return {
      minSalaryCents: stats._min.salaryCents as number,
      maxSalaryCents: stats._max.salaryCents as number,
      avgSalaryCents: Math.round(stats._avg.salaryCents as number),
    };
  }

  async getAverageSalaryByJobTitleInCountry(
    jobTitle: string,
    country: string,
  ): Promise<number | null> {
    const stats = await this.prisma.employee.aggregate({
      where: { jobTitle, country },
      _avg: { salaryCents: true },
      _count: true,
    });

    if (stats._count === 0) {
      return null;
    }

    return Math.round(stats._avg.salaryCents as number);
  }

  async getSalaryByDepartment(): Promise<DepartmentSalaryStats[]> {
    const results = await this.prisma.employee.groupBy({
      by: ['department'],
      _avg: { salaryCents: true },
      orderBy: { department: 'asc' },
    });

    return results.map((result) => ({
      department: result.department,
      // groupBy over existing rows always yields a numeric average
      averageSalaryCents: Math.round(result._avg.salaryCents as number),
    }));
  }

  async getHeadcountByCountry(): Promise<CountryHeadcount[]> {
    const results = await this.prisma.employee.groupBy({
      by: ['country'],
      _count: { _all: true },
      orderBy: { _count: { country: 'desc' } },
    });

    return results.map((result) => ({
      country: result.country,
      headcount: result._count._all,
    }));
  }
}
