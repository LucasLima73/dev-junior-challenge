import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CadastroService } from '../cadastro/cadastro.service.js';
import type { Checkin } from './checkin.entity.js';
import {
  CHECKIN_REPOSITORY,
  type CheckinRepository,
  type ListarEntreOpcoes,
  type ResultadoPaginado,
} from './checkin.repository.js';

function inicioDoDia(data: Date): Date {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function fimDoDia(data: Date): Date {
  const fim = new Date(data);
  fim.setHours(23, 59, 59, 999);
  return fim;
}

@Injectable()
export class CheckinService {
  constructor(
    private readonly cadastro: CadastroService,
    @Inject(CHECKIN_REPOSITORY) private readonly repositorio: CheckinRepository,
  ) {}

  async criar(cpf: string): Promise<Checkin> {
    const agora = new Date();

    // A trava de duplicidade olha só os pendentes: se o paciente já foi
    // atendido hoje e precisar voltar, pode fazer check-in de novo.
    const { itens: pendentesHoje } = await this.repositorio.listarEntre(
      inicioDoDia(agora),
      fimDoDia(agora),
      { status: 'pendentes' },
    );
    if (pendentesHoje.some((checkin) => checkin.cpf === cpf)) {
      throw new ConflictException('Paciente já fez check-in hoje');
    }

    // Se o CPF não existir no cadastro, buscarPorCpf lança e nada é registrado.
    const paciente = await this.cadastro.buscarPorCpf(cpf);

    return this.repositorio.criar({ cpf: paciente.cpf, nome: paciente.nome, chegadaEm: agora });
  }

  listar(opcoes?: ListarEntreOpcoes): Promise<ResultadoPaginado> {
    const agora = new Date();
    return this.repositorio.listarEntre(inicioDoDia(agora), fimDoDia(agora), opcoes);
  }

  async atender(id: string): Promise<Checkin> {
    const checkin = await this.repositorio.marcarComoAtendido(id, new Date());
    if (!checkin) {
      throw new NotFoundException('Check-in não encontrado ou já atendido');
    }
    return checkin;
  }
}
