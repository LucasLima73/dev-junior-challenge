import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { CadastroModule } from './cadastro/cadastro.module.js';
import { CheckinOrmEntity } from './checkin/checkin-orm.entity.js';
import { CheckinModule } from './checkin/checkin.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL', 'postgres://desafio:desafio@localhost:5432/checkin'),
        entities: [CheckinOrmEntity],
        // Ok pro escopo do desafio (sem migrations); ver ENTREGA.md.
        synchronize: true,
      }),
    }),
    CadastroModule,
    CheckinModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
