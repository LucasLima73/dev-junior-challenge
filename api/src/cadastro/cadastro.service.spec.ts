import type { HttpService } from '@nestjs/axios';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { CadastroService } from './cadastro.service.js';

function criarServico(get: (...args: unknown[]) => unknown) {
  const http = { get } as unknown as HttpService;
  const config = { get: () => 'http://localhost:4000' } as unknown as ConfigService;
  return new CadastroService(http, config);
}

function erroHttp(status: number) {
  const erro = new AxiosError('request failed');
  erro.response = { status } as AxiosError['response'];
  return erro;
}

describe('CadastroService', () => {
  it('retorna os dados do paciente quando o cadastro responde 200', async () => {
    const paciente = { cpf: '11111111111', nome: 'Ana Souza', dataNascimento: '1988-03-12' };
    const servico = criarServico(() => of({ data: paciente }));

    await expect(servico.buscarPorCpf('11111111111')).resolves.toEqual(paciente);
  });

  it('lança NotFoundException quando o cadastro responde 404', async () => {
    const servico = criarServico(() => throwError(() => erroHttp(404)));

    await expect(servico.buscarPorCpf('00000000000')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lança BadGatewayException quando o cadastro está fora do ar', async () => {
    const servico = criarServico(() => throwError(() => new Error('ECONNREFUSED')));

    await expect(servico.buscarPorCpf('11111111111')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('lança BadGatewayException quando o cadastro responde um erro inesperado (500)', async () => {
    const servico = criarServico(() => throwError(() => erroHttp(500)));

    await expect(servico.buscarPorCpf('11111111111')).rejects.toBeInstanceOf(BadGatewayException);
  });
});
