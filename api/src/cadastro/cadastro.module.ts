import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CadastroService } from './cadastro.service.js';

@Module({
  imports: [HttpModule],
  providers: [CadastroService],
  exports: [CadastroService],
})
export class CadastroModule {}
