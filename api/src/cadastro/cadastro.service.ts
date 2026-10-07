import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, TimeoutError, timeout } from 'rxjs';
import type { Paciente } from './paciente.interface.js';

const TIMEOUT_MS = 5000;

@Injectable()
export class CadastroService {
  private readonly logger = new Logger(CadastroService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('CADASTRO_URL', 'http://localhost:4000');
  }

  async buscarPorCpf(cpf: string): Promise<Paciente> {
    const { data } = await firstValueFrom(
      this.http.get<Paciente>(`${this.baseUrl}/pacientes/${cpf}`).pipe(
        timeout(TIMEOUT_MS),
        catchError((erro: unknown) => {
          if (erro instanceof AxiosError && erro.response?.status === 404) {
            throw new NotFoundException('CPF não encontrado no cadastro de pacientes');
          }

          const motivo = erro instanceof TimeoutError ? 'timeout' : String(erro);
          this.logger.error(`Falha ao consultar o cadastro (CPF ${cpf}): ${motivo}`);
          throw new BadGatewayException('Serviço de cadastro de pacientes indisponível');
        }),
      ),
    );

    return data;
  }
}
