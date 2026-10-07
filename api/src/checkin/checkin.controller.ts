import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckinService } from './checkin.service.js';
import { CreateCheckinDto } from './dto/create-checkin.dto.js';

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
  listar() {
    return this.checkinService.listar();
  }
}
