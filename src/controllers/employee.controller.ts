import { NextFunction, Request, Response } from 'express';
import {
  mapEmployeeToResponse,
  mapRequestBodyToServiceData,
  mapUpdateBodyToServiceData,
  parseEmployeeRequestBody,
  parseListEmployeesQuery,
  parseRequiredRouteParam,
} from '@/controllers/employee.mapper.js';
import { EmployeeServiceContract } from '@/services/employee.service.js';

export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeServiceContract,
  ) {}

  createEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = parseEmployeeRequestBody(req.body);
      const employee = await this.employeeService.createEmployee(
        mapRequestBodyToServiceData(body),
      );

      res.status(201).json({ data: mapEmployeeToResponse(employee) });
    } catch (error) {
      next(error);
    }
  };

  listEmployees = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const params = parseListEmployeesQuery(req.query);
      const result = await this.employeeService.listEmployees(params);

      res.status(200).json({
        data: result.data.map(mapEmployeeToResponse),
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (error) {
      next(error);
    }
  };

  getEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const employee = await this.employeeService.getEmployee(
        parseRequiredRouteParam(req.params, 'id'),
      );
      res.status(200).json({ data: mapEmployeeToResponse(employee) });
    } catch (error) {
      next(error);
    }
  };

  updateEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = parseEmployeeRequestBody(req.body);
      const employee = await this.employeeService.updateEmployee(
        parseRequiredRouteParam(req.params, 'id'),
        mapUpdateBodyToServiceData(body),
      );

      res.status(200).json({ data: mapEmployeeToResponse(employee) });
    } catch (error) {
      next(error);
    }
  };

  deleteEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.employeeService.deleteEmployee(
        parseRequiredRouteParam(req.params, 'id'),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
