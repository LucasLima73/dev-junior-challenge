import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CadastroModule } from '../cadastro/cadastro.module.js';
import { CheckinOrmEntity } from './checkin-orm.entity.js';
import { CheckinController } from './checkin.controller.js';
import { CHECKIN_REPOSITORY } from './checkin.repository.js';
import { CheckinService } from './checkin.service.js';
import { PostgresCheckinRepository } from './postgres-checkin.repository.js';

@Module({
  imports: [CadastroModule, TypeOrmModule.forFeature([CheckinOrmEntity])],
  controllers: [CheckinController],
  providers: [CheckinService, { provide: CHECKIN_REPOSITORY, useClass: PostgresCheckinRepository }],
})
export class CheckinModule {}
