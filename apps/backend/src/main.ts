import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Prefixo /api para as rotas REST: separa a API das rotas SPA do Angular
  // (ex.: a página /admin) e não afeta o gateway WebSocket (/socket.io).
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
