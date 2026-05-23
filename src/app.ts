import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from '@/config/prisma.js';
import { EmployeeController } from '@/controllers/employee.controller.js';
import { InsightsController } from '@/controllers/insights.controller.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import { EmployeeRepository } from '@/repositories/employee.repository.js';
import { InsightsRepository } from '@/repositories/insights.repository.js';
import { createEmployeeRouter } from '@/routes/employee.routes.js';
import { createInsightsRouter } from '@/routes/insights.routes.js';
import {
  EmployeeService,
  EmployeeServiceContract,
} from '@/services/employee.service.js';
import {
  InsightsService,
  InsightsServiceContract,
} from '@/services/insights.service.js';

export interface CreateAppOptions {
  employeeService?: EmployeeServiceContract;
  insightsService?: InsightsServiceContract;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const employeeService =
    options.employeeService ??
    new EmployeeService(new EmployeeRepository(prisma));
  const employeeController = new EmployeeController(employeeService);

  app.use('/api/employees', createEmployeeRouter(employeeController));

  const insightsService =
    options.insightsService ??
    new InsightsService(new InsightsRepository(prisma));
  const insightsController = new InsightsController(insightsService);

  app.use('/api/insights', createInsightsRouter(insightsController));

  app.use(errorHandler);

  return app;
}
