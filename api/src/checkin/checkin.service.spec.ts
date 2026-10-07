import { ConflictException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import type { CadastroService } from '../cadastro/cadastro.service.js';
import { CheckinService } from './checkin.service.js';

const ANA = { cpf: '11111111111', nome: 'Ana Souza', dataNascimento: '1988-03-12' };

function criarServico(buscarPorCpf: (cpf: string) => Promise<typeof ANA>) {
  const cadastro = { buscarPorCpf } as unknown as CadastroService;
  return new CheckinService(cadastro);
}

describe('CheckinService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('registra o check-in com o nome retornado pelo cadastro', async () => {
    const servico = criarServico(async () => ANA);

    const checkin = await servico.criar(ANA.cpf);

    expect(checkin.nome).toBe('Ana Souza');
    expect(servico.listar()).toHaveLength(1);
  });

  it('não registra na fila quando o CPF não existe no cadastro', async () => {
    const servico = criarServico(async () => {
      throw new NotFoundException('CPF não encontrado no cadastro de pacientes');
    });

    await expect(servico.criar('00000000000')).rejects.toBeInstanceOf(NotFoundException);
    expect(servico.listar()).toHaveLength(0);
  });

  it('mantém a ordem de chegada ao registrar vários check-ins', async () => {
    const servico = criarServico(async (cpf) => ({ ...ANA, cpf }));

    await servico.criar('11111111111');
    await servico.criar('22222222222');

    expect(servico.listar().map((c) => c.cpf)).toEqual(['11111111111', '22222222222']);
  });

  it('bloqueia um segundo check-in do mesmo paciente no mesmo dia', async () => {
    const buscarPorCpf = vi.fn().mockResolvedValue(ANA);
    const servico = criarServico(buscarPorCpf);

    await servico.criar(ANA.cpf);

    await expect(servico.criar(ANA.cpf)).rejects.toBeInstanceOf(ConflictException);
    // Nem precisou consultar o cadastro de novo: a trava é checada antes.
    expect(buscarPorCpf).toHaveBeenCalledTimes(1);
  });

  it('lista somente os check-ins do dia atual', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T10:00:00'));

    const servico = criarServico(async () => ANA);
    await servico.criar(ANA.cpf);

    vi.setSystemTime(new Date('2026-10-07T09:00:00'));

    expect(servico.listar()).toHaveLength(0);
  });
});
