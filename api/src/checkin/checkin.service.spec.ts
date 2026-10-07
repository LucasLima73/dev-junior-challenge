import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import type { CadastroService } from '../cadastro/cadastro.service.js';
import { CheckinService } from './checkin.service.js';
import type {
  CheckinRepository,
  CriarCheckinDados,
  ListarEntreOpcoes,
  ResultadoPaginado,
} from './checkin.repository.js';
import type { Checkin } from './checkin.entity.js';

// Fake simples, só para os testes: guarda em memória e respeita o mesmo
// contrato que o PostgresCheckinRepository, sem precisar de um banco real.
class FakeCheckinRepository implements CheckinRepository {
  private readonly registros: Checkin[] = [];

  async criar(dados: CriarCheckinDados): Promise<Checkin> {
    const checkin: Checkin = {
      id: randomUUID(),
      cpf: dados.cpf,
      nome: dados.nome,
      chegadaEm: dados.chegadaEm.toISOString(),
      atendidoEm: null,
    };
    this.registros.push(checkin);
    return checkin;
  }

  async listarEntre(inicio: Date, fim: Date, opcoes: ListarEntreOpcoes = {}): Promise<ResultadoPaginado> {
    const status = opcoes.status ?? 'pendentes';
    const noIntervalo = this.registros.filter((c) => {
      const data = new Date(c.chegadaEm);
      return data >= inicio && data <= fim;
    });
    const filtrados = noIntervalo.filter((c) => {
      if (status === 'pendentes') return c.atendidoEm === null;
      if (status === 'atendidos') return c.atendidoEm !== null;
      return true;
    });

    if (opcoes.tamanhoPagina === undefined) {
      return { itens: filtrados, total: filtrados.length };
    }
    const pagina = opcoes.pagina ?? 1;
    const inicioPagina = (pagina - 1) * opcoes.tamanhoPagina;
    return {
      itens: filtrados.slice(inicioPagina, inicioPagina + opcoes.tamanhoPagina),
      total: filtrados.length,
    };
  }

  async marcarComoAtendido(id: string, atendidoEm: Date): Promise<Checkin | null> {
    const checkin = this.registros.find((c) => c.id === id);
    if (!checkin || checkin.atendidoEm !== null) return null;
    checkin.atendidoEm = atendidoEm.toISOString();
    return checkin;
  }
}

const ANA = { cpf: '11111111111', nome: 'Ana Souza', dataNascimento: '1988-03-12' };

function criarServico(buscarPorCpf: (cpf: string) => Promise<typeof ANA>) {
  const cadastro = { buscarPorCpf } as unknown as CadastroService;
  return new CheckinService(cadastro, new FakeCheckinRepository());
}

describe('CheckinService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('registra o check-in com o nome retornado pelo cadastro', async () => {
    const servico = criarServico(async () => ANA);

    const checkin = await servico.criar(ANA.cpf);

    expect(checkin.nome).toBe('Ana Souza');
    expect(checkin.atendidoEm).toBeNull();
    expect((await servico.listar()).itens).toHaveLength(1);
  });

  it('não registra na fila quando o CPF não existe no cadastro', async () => {
    const servico = criarServico(async () => {
      throw new NotFoundException('CPF não encontrado no cadastro de pacientes');
    });

    await expect(servico.criar('00000000000')).rejects.toBeInstanceOf(NotFoundException);
    expect((await servico.listar()).itens).toHaveLength(0);
  });

  it('mantém a ordem de chegada ao registrar vários check-ins', async () => {
    const servico = criarServico(async (cpf) => ({ ...ANA, cpf }));

    await servico.criar('11111111111');
    await servico.criar('22222222222');

    const { itens } = await servico.listar();
    expect(itens.map((c) => c.cpf)).toEqual(['11111111111', '22222222222']);
  });

  it('bloqueia um segundo check-in pendente do mesmo paciente no mesmo dia', async () => {
    const buscarPorCpf = vi.fn().mockResolvedValue(ANA);
    const servico = criarServico(buscarPorCpf);

    await servico.criar(ANA.cpf);

    await expect(servico.criar(ANA.cpf)).rejects.toBeInstanceOf(ConflictException);
    expect(buscarPorCpf).toHaveBeenCalledTimes(1);
  });

  it('permite novo check-in do mesmo paciente no mesmo dia se o anterior já foi atendido', async () => {
    const buscarPorCpf = vi.fn().mockResolvedValue(ANA);
    const servico = criarServico(buscarPorCpf);

    const primeiro = await servico.criar(ANA.cpf);
    await servico.atender(primeiro.id);

    await expect(servico.criar(ANA.cpf)).resolves.toMatchObject({ cpf: ANA.cpf });
  });

  it('lista somente os check-ins do dia atual', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T10:00:00'));

    const servico = criarServico(async () => ANA);
    await servico.criar(ANA.cpf);

    vi.setSystemTime(new Date('2026-10-07T09:00:00'));

    expect((await servico.listar()).itens).toHaveLength(0);
  });

  it('marca um check-in como atendido e ele some da fila de pendentes', async () => {
    const servico = criarServico(async () => ANA);
    const checkin = await servico.criar(ANA.cpf);

    const atendido = await servico.atender(checkin.id);

    expect(atendido.atendidoEm).not.toBeNull();
    expect((await servico.listar({ status: 'pendentes' })).itens).toHaveLength(0);
    expect((await servico.listar({ status: 'atendidos' })).itens).toHaveLength(1);
  });

  it('lança NotFoundException ao tentar atender um id inexistente', async () => {
    const servico = criarServico(async () => ANA);

    await expect(servico.atender('id-que-nao-existe')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('pagina a listagem quando tamanhoPagina é informado', async () => {
    const servico = criarServico(async (cpf) => ({ ...ANA, cpf }));
    await servico.criar('11111111111');
    await servico.criar('22222222222');
    await servico.criar('33333333333');

    const pagina1 = await servico.listar({ pagina: 1, tamanhoPagina: 2 });
    const pagina2 = await servico.listar({ pagina: 2, tamanhoPagina: 2 });

    expect(pagina1.total).toBe(3);
    expect(pagina1.itens.map((c) => c.cpf)).toEqual(['11111111111', '22222222222']);
    expect(pagina2.itens.map((c) => c.cpf)).toEqual(['33333333333']);
  });
});
