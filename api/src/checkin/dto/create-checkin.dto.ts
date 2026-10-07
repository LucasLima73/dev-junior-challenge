import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsCpfFormat } from './validators/is-cpf.validator.js';

export class CreateCheckinDto {
  @ApiProperty({
    example: '111.111.111-11',
    description: 'CPF do paciente, com ou sem máscara',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsCpfFormat()
  cpf!: string;
}
