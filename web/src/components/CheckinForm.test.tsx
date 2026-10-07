import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, criarCheckin } from '../api';
import { CheckinForm } from './CheckinForm';

vi.mock('../api', () => ({
  criarCheckin: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const criarCheckinMock = vi.mocked(criarCheckin);

describe('CheckinForm', () => {
  beforeEach(() => {
    criarCheckinMock.mockReset();
  });

  it('mantém o botão desabilitado até o CPF ter 11 dígitos', async () => {
    const usuario = userEvent.setup();
    render(<CheckinForm onCheckinCriado={vi.fn()} />);

    const input = screen.getByLabelText('CPF do paciente');
    const botao = screen.getByRole('button', { name: /fazer check-in/i });

    expect(botao).toBeDisabled();

    await usuario.type(input, '1111111111'); // 10 dígitos
    expect(botao).toBeDisabled();

    await usuario.type(input, '1'); // 11º dígito
    expect(botao).toBeEnabled();
  });

  it('aplica a máscara de CPF enquanto o usuário digita', async () => {
    const usuario = userEvent.setup();
    render(<CheckinForm onCheckinCriado={vi.fn()} />);

    await usuario.type(screen.getByLabelText('CPF do paciente'), '11111111111');

    expect(screen.getByLabelText('CPF do paciente')).toHaveValue('111.111.111-11');
  });

  it('ao enviar com sucesso, chama onCheckinCriado, mostra mensagem e limpa o campo', async () => {
    const checkin = {
      id: '1',
      cpf: '11111111111',
      nome: 'Ana Souza',
      chegadaEm: new Date().toISOString(),
      atendidoEm: null,
    };
    criarCheckinMock.mockResolvedValue(checkin);
    const aoCriar = vi.fn();
    const usuario = userEvent.setup();

    render(<CheckinForm onCheckinCriado={aoCriar} />);
    await usuario.type(screen.getByLabelText('CPF do paciente'), '11111111111');
    await usuario.click(screen.getByRole('button', { name: /fazer check-in/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Ana Souza');
    });
    expect(aoCriar).toHaveBeenCalledWith(checkin);
    expect(screen.getByLabelText('CPF do paciente')).toHaveValue('');
    expect(criarCheckinMock).toHaveBeenCalledWith('11111111111');
  });

  it('mostra a mensagem de erro da API quando o check-in falha', async () => {
    criarCheckinMock.mockRejectedValue(new ApiError('CPF não encontrado no cadastro de pacientes'));
    const usuario = userEvent.setup();

    render(<CheckinForm onCheckinCriado={vi.fn()} />);
    await usuario.type(screen.getByLabelText('CPF do paciente'), '99999999999');
    await usuario.click(screen.getByRole('button', { name: /fazer check-in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('CPF não encontrado no cadastro de pacientes');
    });
  });
});
