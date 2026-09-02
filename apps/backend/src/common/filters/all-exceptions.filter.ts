import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '../../../generated/prisma';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Unico punto donde se traduce una excepcion a una respuesta HTTP.
 *
 * Garantiza que TODA respuesta de error tenga la misma forma y que los detalles
 * internos (stack, SQL, nombres de constraint) nunca salgan al cliente: los
 * 5xx se registran completos en el log del servidor y al cliente le llega un
 * mensaje generico.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error, message } = this.resolve(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // El ValidationPipe devuelve { message: string[], error, statusCode }.
      if (typeof payload === 'object' && payload !== null && 'message' in payload) {
        const shaped = payload as { message: string | string[]; error?: string };
        return {
          status,
          error: shaped.error ?? 'Error',
          message: shaped.message,
        };
      }

      return { status, error: exception.name, message: exception.message };
    }

    // Errores de Prisma que corresponden a una causa del cliente, no a un 500.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            status: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: 'Ya existe un registro con ese valor unico.',
          };
        case 'P2025':
          return {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: 'El recurso solicitado no existe.',
          };
        case 'P2003':
          return {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'La referencia indicada no existe.',
          };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Ocurrio un error inesperado.',
    };
  }
}
