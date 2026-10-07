import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckinService } from './checkin.service.js';
import { CreateCheckinDto } from './dto/create-checkin.dto.js';
import { ListarCheckinsQueryDto } from './dto/listar-checkins-query.dto.js';

@ApiTags('checkins')
@Controller('checkins')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra o check-in de um paciente a partir do CPF' })
  @ApiResponse({ status: 201, description: 'Check-in registrado' })
  @ApiResponse({ status: 400, description: 'CPF com formato inválido' })
  @ApiResponse({ status: 404, description: 'CPF não encontrado no cadastro' })
  @ApiResponse({ status: 409, description: 'Paciente já fez check-in hoje' })
  criar(@Body() dto: CreateCheckinDto) {
    return this.checkinService.criar(dto.cpf);
  }

  @Get()
  @ApiOperation({ summary: 'Lista a fila de check-ins do dia, em ordem de chegada' })
  listar(@Query() query: ListarCheckinsQueryDto) {
    return this.checkinService.listar(query);
  }

  @Patch(':id/atendido')
  @ApiOperation({ summary: 'Marca um check-in como atendido' })
  @ApiResponse({ status: 200, description: 'Check-in marcado como atendido' })
  @ApiResponse({ status: 400, description: 'Id com formato inválido (não é um UUID)' })
  @ApiResponse({ status: 404, description: 'Check-in não encontrado ou já atendido' })
  atender(@Param('id', ParseUUIDPipe) id: string) {
    return this.checkinService.atender(id);
  }
}
