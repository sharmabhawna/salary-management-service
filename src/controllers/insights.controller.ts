import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '@/errors/AppError.js';
import { InsightsServiceContract } from '@/services/insights.service.js';

function parseRequiredQueryParam(
  query: Request['query'],
  field: string,
): string {
  const value = query[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }

  return value.trim();
}

export class InsightsController {
  constructor(
    private readonly insightsService: InsightsServiceContract,
  ) {}

  getSalaryStatsByCountry = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const country = parseRequiredQueryParam(req.query, 'country');
      const result = await this.insightsService.getSalaryStatsByCountry(country);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAverageSalaryByJobTitleInCountry = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const country = parseRequiredQueryParam(req.query, 'country');
      const jobTitle = parseRequiredQueryParam(req.query, 'jobTitle');
      const result =
        await this.insightsService.getAverageSalaryByJobTitleInCountry(
          jobTitle,
          country,
        );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getSalaryByDepartment = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.insightsService.getSalaryByDepartment();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getHeadcountByCountry = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.insightsService.getHeadcountByCountry();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
