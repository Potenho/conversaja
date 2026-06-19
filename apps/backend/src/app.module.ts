import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ChatModule } from './chat/chat.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [DatabaseModule, ChatModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
