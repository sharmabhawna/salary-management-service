import {
  CountryHeadcount,
  CountrySalaryStats,
  DepartmentSalaryStats,
} from '@/repositories/insights.repository.js';

export interface InsightsRepositoryContract {
  getSalaryStatsByCountry(country: string): Promise<CountrySalaryStats | null>;
  getAverageSalaryByJobTitleInCountry(
    jobTitle: string,
    country: string,
  ): Promise<number | null>;
  getSalaryByDepartment(): Promise<DepartmentSalaryStats[]>;
  getHeadcountByCountry(): Promise<CountryHeadcount[]>;
}

export interface CountrySalaryInsight {
  country: string;
  min: number;
  max: number;
  average: number;
}

export interface JobTitleSalaryInsight {
  country: string;
  jobTitle: string;
  average: number;
}

export interface DepartmentSalaryInsight {
  department: string;
  average: number;
}

export interface CountryHeadcountInsight {
  country: string;
  headcount: number;
}

export interface FilteredInsightResponse<T> {
  data: T | null;
  message?: string;
}

export interface OrgWideInsightResponse<T> {
  data: T[];
}

export interface InsightsServiceContract {
  getSalaryStatsByCountry(
    country: string,
  ): Promise<FilteredInsightResponse<CountrySalaryInsight>>;
  getAverageSalaryByJobTitleInCountry(
    jobTitle: string,
    country: string,
  ): Promise<FilteredInsightResponse<JobTitleSalaryInsight>>;
  getSalaryByDepartment(): Promise<
    OrgWideInsightResponse<DepartmentSalaryInsight>
  >;
  getHeadcountByCountry(): Promise<
    OrgWideInsightResponse<CountryHeadcountInsight>
  >;
}

function centsToDollars(salaryCents: number): number {
  return salaryCents / 100;
}

export class InsightsService implements InsightsServiceContract {
  constructor(
    private readonly insightsRepository: InsightsRepositoryContract,
  ) {}

  async getSalaryStatsByCountry(
    country: string,
  ): Promise<FilteredInsightResponse<CountrySalaryInsight>> {
    const stats = await this.insightsRepository.getSalaryStatsByCountry(country);

    if (stats === null) {
      return {
        data: null,
        message: `No employees found in ${country}`,
      };
    }

    return {
      data: {
        country,
        min: centsToDollars(stats.minSalaryCents),
        max: centsToDollars(stats.maxSalaryCents),
        average: centsToDollars(stats.avgSalaryCents),
      },
    };
  }

  async getAverageSalaryByJobTitleInCountry(
    jobTitle: string,
    country: string,
  ): Promise<FilteredInsightResponse<JobTitleSalaryInsight>> {
    const averageSalaryCents =
      await this.insightsRepository.getAverageSalaryByJobTitleInCountry(
        jobTitle,
        country,
      );

    if (averageSalaryCents === null) {
      return {
        data: null,
        message: `No employees found with job title '${jobTitle}' in ${country}`,
      };
    }

    return {
      data: {
        country,
        jobTitle,
        average: centsToDollars(averageSalaryCents),
      },
    };
  }

  async getSalaryByDepartment(): Promise<
    OrgWideInsightResponse<DepartmentSalaryInsight>
  > {
    const stats = await this.insightsRepository.getSalaryByDepartment();

    return {
      data: stats.map((stat) => ({
        department: stat.department,
        average: centsToDollars(stat.averageSalaryCents),
      })),
    };
  }

  async getHeadcountByCountry(): Promise<
    OrgWideInsightResponse<CountryHeadcountInsight>
  > {
    const headcounts = await this.insightsRepository.getHeadcountByCountry();

    return {
      data: headcounts.map((headcount) => ({
        country: headcount.country,
        headcount: headcount.headcount,
      })),
    };
  }
}
