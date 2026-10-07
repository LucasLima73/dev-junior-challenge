import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { CheckinOrmEntity } from './checkin-orm.entity.js';
import type { Checkin } from './checkin.entity.js';
import type {
  CheckinRepository,
  CriarCheckinDados,
  ListarEntreOpcoes,
  ResultadoPaginado,
} from './checkin.repository.js';

@Injectable()
export class PostgresCheckinRepository implements CheckinRepository {
  constructor(
    @InjectRepository(CheckinOrmEntity)
    private readonly repositorio: Repository<CheckinOrmEntity>,
  ) {}

  async criar(dados: CriarCheckinDados): Promise<Checkin> {
    const entidade = await this.repositorio.save(
      this.repositorio.create({ ...dados, atendidoEm: null }),
    );
    return paraCheckin(entidade);
  }

  async listarEntre(
    inicio: Date,
    fim: Date,
    opcoes: ListarEntreOpcoes = {},
  ): Promise<ResultadoPaginado> {
    const status = opcoes.status ?? 'pendentes';
    // Sem tamanhoPagina, devolve tudo (uso interno da regra de negócio e
    // comportamento padrão da fila quando o front não pede página).
    const paginar = opcoes.tamanhoPagina !== undefined;
    const pagina = opcoes.pagina ?? 1;
    const tamanhoPagina = opcoes.tamanhoPagina ?? 0;

    const [itens, total] = await this.repositorio.findAndCount({
      where: {
        chegadaEm: Between(inicio, fim),
        ...(status === 'pendentes' && { atendidoEm: IsNull() }),
        ...(status === 'atendidos' && { atendidoEm: Not(IsNull()) }),
      },
      order: { chegadaEm: 'ASC' },
      ...(paginar && { skip: (pagina - 1) * tamanhoPagina, take: tamanhoPagina }),
    });

    return { itens: itens.map(paraCheckin), total };
  }

  async marcarComoAtendido(id: string, atendidoEm: Date): Promise<Checkin | null> {
    const entidade = await this.repositorio.findOne({ where: { id } });
    if (!entidade || entidade.atendidoEm !== null) {
      return null;
    }

    entidade.atendidoEm = atendidoEm;
    await this.repositorio.save(entidade);
    return paraCheckin(entidade);
  }
}

function paraCheckin(entidade: CheckinOrmEntity): Checkin {
  return {
    id: entidade.id,
    cpf: entidade.cpf,
    nome: entidade.nome,
    chegadaEm: entidade.chegadaEm.toISOString(),
    atendidoEm: entidade.atendidoEm?.toISOString() ?? null,
  };
}
