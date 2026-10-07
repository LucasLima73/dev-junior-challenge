import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { CadastroService } from '../cadastro/cadastro.service.js';
import type { Checkin } from './checkin.entity.js';

function mesmoDia(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

@Injectable()
export class CheckinService {
  // Persistência em memória: a fila é perdida se a API reiniciar (ver ENTREGA.md).
  private readonly fila: Checkin[] = [];

  constructor(private readonly cadastro: CadastroService) {}

  async criar(cpf: string): Promise<Checkin> {
    const agora = new Date();

    const jaFezCheckinHoje = this.fila.some(
      (checkin) => checkin.cpf === cpf && mesmoDia(new Date(checkin.chegadaEm), agora),
    );
    if (jaFezCheckinHoje) {
      throw new ConflictException('Paciente já fez check-in hoje');
    }

    // Se o CPF não existir no cadastro, buscarPorCpf lança e nada é registrado.
    const paciente = await this.cadastro.buscarPorCpf(cpf);

    const checkin: Checkin = {
      id: randomUUID(),
      cpf: paciente.cpf,
      nome: paciente.nome,
      chegadaEm: agora.toISOString(),
    };
    this.fila.push(checkin);
    return checkin;
  }

  // Fila do dia, em ordem de chegada; zera sozinha quando o dia vira.
  listar(): Checkin[] {
    const agora = new Date();
    return this.fila.filter((checkin) => mesmoDia(new Date(checkin.chegadaEm), agora));
  }
}
