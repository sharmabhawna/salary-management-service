import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from '@/config/prisma.js';
import { EmployeeController } from '@/controllers/employee.controller.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import { EmployeeRepository } from '@/repositories/employee.repository.js';
import { createEmployeeRouter } from '@/routes/employee.routes.js';
import {
  EmployeeService,
  EmployeeServiceContract,
} from '@/services/employee.service.js';

export interface CreateAppOptions {
  employeeService?: EmployeeServiceContract;
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

  app.use(errorHandler);

  return app;
}
