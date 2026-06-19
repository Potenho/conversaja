import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Conexão com o PostgreSQL via TypeORM. A URL vem de DATABASE_URL.
 * `synchronize: true` cria/atualiza o schema automaticamente — adequado ao
 * escopo do projeto (em produção real, usaríamos migrações versionadas).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url:
          process.env.DATABASE_URL ??
          'postgresql://conversaja:conversaja@localhost:5432/conversaja',
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
