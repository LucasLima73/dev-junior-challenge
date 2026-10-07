import { type INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { CadastroService } from '../src/cadastro/cadastro.service.js';

describe('Checkins (e2e)', () => {
  let app: INestApplication<App>;
  const cadastroFake = { buscarPorCpf: vi.fn() };

  beforeEach(async () => {
    cadastroFake.buscarPorCpf.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CadastroService)
      .useValue(cadastroFake)
      .compile();

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
      });

    const resposta = await request(app.getHttpServer() as App).get('/checkins').expect(200);
    expect(resposta.body).toHaveLength(1);
  });

  it('retorna 404 quando o CPF não existe no cadastro e não registra na fila', async () => {
    cadastroFake.buscarPorCpf.mockRejectedValue(
      new NotFoundException('CPF não encontrado no cadastro de pacientes'),
    );

    await request(app.getHttpServer() as App)
      .post('/checkins')
      .send({ cpf: '00000000000' })
      .expect(404);

    const resposta = await request(app.getHttpServer() as App).get('/checkins').expect(200);
    expect(resposta.body).toHaveLength(0);
  });

  it('retorna 400 quando o CPF não tem 11 dígitos', async () => {
    await request(app.getHttpServer() as App)
      .post('/checkins')
      .send({ cpf: '123' })
      .expect(400);
  });

  it('retorna 409 ao tentar um segundo check-in do mesmo paciente no mesmo dia', async () => {
    cadastroFake.buscarPorCpf.mockResolvedValue({
      cpf: '22222222222',
      nome: 'Bruno Carvalho',
      dataNascimento: '1975-11-02',
    });

    await request(app.getHttpServer() as App)
      .post('/checkins')
      .send({ cpf: '22222222222' })
      .expect(201);
    await request(app.getHttpServer() as App)
      .post('/checkins')
      .send({ cpf: '22222222222' })
      .expect(409);
  });
});
