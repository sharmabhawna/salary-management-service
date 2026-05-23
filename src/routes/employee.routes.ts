import { Router } from 'express';
import { EmployeeController } from '@/controllers/employee.controller.js';

export function createEmployeeRouter(controller: EmployeeController): Router {
  const router = Router();

  router.post('/', controller.createEmployee);
  router.get('/', controller.listEmployees);
  router.get('/:id', controller.getEmployee);
  router.put('/:id', controller.updateEmployee);
  router.delete('/:id', controller.deleteEmployee);

  return router;
}
