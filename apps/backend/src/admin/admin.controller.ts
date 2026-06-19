import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type {
  AtualizarSalaPayload,
  CriarSalaOficialPayload,
  MetricasAdmin,
  SalaResumo,
} from '@conversaja/shared';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { DomainExceptionFilter } from './domain-exception.filter';

/** API administrativa (RF14/RF15). Protegida pelo AdminGuard (token). */
@Controller('admin')
@UseGuards(AdminGuard)
@UseFilters(DomainExceptionFilter)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metricas') // RF15
  metricas(): Promise<MetricasAdmin> {
    return this.admin.metricas();
  }

  @Get('salas')
  listar(): Promise<SalaResumo[]> {
    return this.admin.listarSalas();
  }

  @Post('salas') // RF14 — criar
  criar(@Body() body: CriarSalaOficialPayload): Promise<SalaResumo> {
    return this.admin.criarOficial(body);
  }

  @Patch('salas/:id') // RF14 — editar
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarSalaPayload,
  ): Promise<SalaResumo> {
    return this.admin.atualizar(id, body);
  }

  @Delete('salas/:id') // RF14 — remover
  @HttpCode(204)
  remover(@Param('id') id: string): Promise<void> {
    return this.admin.remover(id);
  }
}
