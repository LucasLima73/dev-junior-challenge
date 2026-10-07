import { Module } from '@nestjs/common';
import { CadastroModule } from '../cadastro/cadastro.module.js';
import { CheckinController } from './checkin.controller.js';
import { CheckinService } from './checkin.service.js';

@Module({
  imports: [CadastroModule],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
