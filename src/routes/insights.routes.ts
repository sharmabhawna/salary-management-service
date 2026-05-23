import { Router } from 'express';
import { InsightsController } from '@/controllers/insights.controller.js';

export function createInsightsRouter(controller: InsightsController): Router {
  const router = Router();

  router.get('/salary/country', controller.getSalaryStatsByCountry);
  router.get('/salary/job-title', controller.getAverageSalaryByJobTitleInCountry);
  router.get('/salary/department', controller.getSalaryByDepartment);
  router.get('/headcount/country', controller.getHeadcountByCountry);

  return router;
}
