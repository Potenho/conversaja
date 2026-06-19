import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

/** Painel administrativo: gestão de salas oficiais (RF14) e métricas (RF15). */
@Module({
  imports: [ChatModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
