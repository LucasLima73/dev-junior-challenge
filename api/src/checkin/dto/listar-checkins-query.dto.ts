import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import type { StatusFiltro } from '../checkin.repository.js';

export class ListarCheckinsQueryDto {
  @ApiPropertyOptional({
    enum: ['pendentes', 'atendidos', 'todos'],
    default: 'pendentes',
    description: 'pendentes = ainda não atendidos (padrão da fila)',
  })
  @IsOptional()
  @IsIn(['pendentes', 'atendidos', 'todos'])
  status?: StatusFiltro;

  @ApiPropertyOptional({ minimum: 1, description: 'Sem página, devolve a fila inteira' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  tamanhoPagina?: number;
}
