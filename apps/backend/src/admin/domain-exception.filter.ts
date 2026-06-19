import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../chat/domain-error';

/** Converte erros de regra de negócio (DomainError) em respostas HTTP claras. */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception.codigo === 'SALA_NAO_ENCONTRADA'
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
    response
      .status(status)
      .json({ codigo: exception.codigo, mensagem: exception.message });
  }
}
