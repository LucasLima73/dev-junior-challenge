import type { Checkin } from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface CorpoDeErro {
  message?: string | string[];
}

export class ApiError extends Error {}

async function tratarResposta<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as CorpoDeErro | null;
    const mensagem = Array.isArray(corpo?.message)
      ? corpo.message.join(', ')
      : corpo?.message ?? `Erro inesperado (${resposta.status})`;
    throw new ApiError(mensagem);
  }
  return resposta.json() as Promise<T>;
}

export async function criarCheckin(cpf: string): Promise<Checkin> {
  const resposta = await fetch(`${BASE_URL}/checkins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf }),
  });
  return tratarResposta<Checkin>(resposta);
}

export async function listarFila(): Promise<Checkin[]> {
  const resposta = await fetch(`${BASE_URL}/checkins`);
  return tratarResposta<Checkin[]>(resposta);
}
