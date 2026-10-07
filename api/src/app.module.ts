import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { CadastroModule } from './cadastro/cadastro.module.js';
import { CheckinModule } from './checkin/checkin.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CadastroModule, CheckinModule],
  controllers: [AppController],
})
export class AppModule {}
