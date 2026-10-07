import { randomUUID } from 'node:crypto';
import { type INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { CadastroService } from '../src/cadastro/cadastro.service.js';
import { CheckinController } from '../src/checkin/checkin.controller.js';
import type { Checkin } from '../src/checkin/checkin.entity.js';
import {
  CHECKIN_REPOSITORY,
  type CheckinRepository,
  type CriarCheckinDados,
  type ListarEntreOpcoes,
  type ResultadoPaginado,
} from '../src/checkin/checkin.repository.js';
import { CheckinService } from '../src/checkin/checkin.service.js';

// Fake no lugar do Postgres: o e2e aqui testa o contrato HTTP (status,
// formato da resposta), não a integração real com o banco.
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
    const filtrados = this.registros.filter((c) => {
      const data = new Date(c.chegadaEm);
      const noIntervalo = data >= inicio && data <= fim;
      if (!noIntervalo) return false;
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

describe('Checkins (e2e)', () => {
  let app: INestApplication<App>;
  const cadastroFake = { buscarPorCpf: vi.fn() };

  beforeEach(async () => {
    cadastroFake.buscarPorCpf.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CheckinController],
      providers: [
        CheckinService,
        { provide: CadastroService, useValue: cadastroFake },
        { provide: CHECKIN_REPOSITORY, useClass: FakeCheckinRepository },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('cria um check-in (com CPF mascarado) e depois lista a fila', async () => {
    cadastroFake.buscarPorCpf.mockResolvedValue({
      cpf: '11111111111',
      nome: 'Ana Souza',
      dataNascimento: '1988-03-12',
    });

    await request(app.getHttpServer() as App)
      .post('/checkins')
      .send({ cpf: '111.111.111-11' })
      .expect(201)
      .expect((res) => {
        expect(res.body.nome).toBe('Ana Souza');
        expect(res.body.atendidoEm).toBeNull();
      });

    const resposta = await request(app.getHttpServer() as App).get('/checkins').expect(200);
    expect(resposta.body.itens).toHaveLength(1);
    expect(resposta.body.total).toBe(1);
  });

  it('retorna 404 quando o CPF não existe no cadastro e não registra na fila', async () => {
    cadastroFake.buscarPorCpf.mockRejectedValue(
      new NotFoundException('CPF não encontrado no cadastro de pacientes'),
    );

    await request(app.getHttpServer() as App)
      .post('/checkins')
      .send({ cpf: '00000000000' })
      .expect(404);
  });

  it('retorna 400 quando o CPF não tem 11 dígitos', async () => {
    await request(app.getHttpServer() as App)
      .post('/checkins')
      .send({ cpf: '123' })
      .expect(400);
  });

  it('retorna 409 ao tentar um segundo check-in pendente do mesmo paciente no mesmo dia', async () => {
    cadastroFake.buscarPorCpf.mockResolvedValue({
      cpf: '22222222222',
      nome: 'Bruno Carvalho',
      dataNascimento: '1975-11-02',
    });

    await request(app.getHttpServer() as App).post('/checkins').send({ cpf: '22222222222' }).expect(201);
    await request(app.getHttpServer() as App).post('/checkins').send({ cpf: '22222222222' }).expect(409);
  });

  it('marca um check-in como atendido e ele some da fila de pendentes', async () => {
    cadastroFake.buscarPorCpf.mockResolvedValue({
      cpf: '33333333333',
      nome: 'Carla Menezes',
      dataNascimento: '1993-07-25',
    });

    const criado = await request(app.getHttpServer() as App)
      .post('/checkins')
      .send({ cpf: '33333333333' })
      .expect(201);

    await request(app.getHttpServer() as App)
      .patch(`/checkins/${criado.body.id}/atendido`)
      .expect(200)
      .expect((res) => {
        expect(res.body.atendidoEm).not.toBeNull();
      });

    const fila = await request(app.getHttpServer() as App).get('/checkins').expect(200);
    expect(fila.body.itens).toHaveLength(0);
  });

  it('retorna 404 ao tentar atender um id inexistente (mas um UUID válido)', async () => {
    await request(app.getHttpServer() as App)
      .patch(`/checkins/${randomUUID()}/atendido`)
      .expect(404);
  });

  it('retorna 400 ao tentar atender um id que não é um UUID', async () => {
    await request(app.getHttpServer() as App)
      .patch('/checkins/id-com-formato-invalido/atendido')
      .expect(400);
  });

  it('pagina a listagem quando pagina e tamanhoPagina são informados', async () => {
    cadastroFake.buscarPorCpf.mockImplementation((cpf: string) =>
      Promise.resolve({ cpf, nome: `Paciente ${cpf}`, dataNascimento: '2000-01-01' }),
    );

    await request(app.getHttpServer() as App).post('/checkins').send({ cpf: '11111111111' }).expect(201);
    await request(app.getHttpServer() as App).post('/checkins').send({ cpf: '22222222222' }).expect(201);

    const pagina1 = await request(app.getHttpServer() as App)
      .get('/checkins')
      .query({ pagina: 1, tamanhoPagina: 1 })
      .expect(200);

    expect(pagina1.body.itens).toHaveLength(1);
    expect(pagina1.body.total).toBe(2);
  });
});
