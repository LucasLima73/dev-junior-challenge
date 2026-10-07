import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Checkin } from '../types';
import { CheckinQueue } from './CheckinQueue';

function criarCheckin(sufixo: string, atendidoEm: string | null = null): Checkin {
  return {
    id: `id-${sufixo}`,
    cpf: `1111111111${sufixo}`,
    nome: `Paciente ${sufixo}`,
    chegadaEm: new Date('2026-10-07T10:00:00Z').toISOString(),
    atendidoEm,
  };
}

describe('CheckinQueue', () => {
  it('mostra "Carregando fila..." quando carregando e sem itens ainda', () => {
    render(
      <CheckinQueue
        fila={[]}
        carregando
        mostrarAcaoAtender
        atendendoId={null}
        onAtender={vi.fn()}
      />,
    );

    expect(screen.getByText('Carregando fila...')).toBeInTheDocument();
  });

  it('mostra "Nenhum paciente aqui." quando não há itens e não está carregando', () => {
    render(
      <CheckinQueue
        fila={[]}
        carregando={false}
        mostrarAcaoAtender
        atendendoId={null}
        onAtender={vi.fn()}
      />,
    );

    expect(screen.getByText('Nenhum paciente aqui.')).toBeInTheDocument();
  });

  it('lista os pacientes na ordem recebida', () => {
    const fila = [criarCheckin('1'), criarCheckin('2')];
    render(
      <CheckinQueue
        fila={fila}
        carregando={false}
        mostrarAcaoAtender
        atendendoId={null}
        onAtender={vi.fn()}
      />,
    );

    const itens = screen.getAllByRole('listitem');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('Paciente 1');
    expect(itens[1]).toHaveTextContent('Paciente 2');
  });

  it('chama onAtender com o id certo ao clicar em Atender', async () => {
    const fila = [criarCheckin('1')];
    const aoAtender = vi.fn();
    const usuario = userEvent.setup();

    render(
      <CheckinQueue
        fila={fila}
        carregando={false}
        mostrarAcaoAtender
        atendendoId={null}
        onAtender={aoAtender}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: /atender/i }));

    expect(aoAtender).toHaveBeenCalledWith('id-1');
  });

  it('não mostra o botão de atender quando mostrarAcaoAtender é falso', () => {
    const fila = [criarCheckin('1', new Date().toISOString())];
    render(
      <CheckinQueue
        fila={fila}
        carregando={false}
        mostrarAcaoAtender={false}
        atendendoId={null}
        onAtender={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
