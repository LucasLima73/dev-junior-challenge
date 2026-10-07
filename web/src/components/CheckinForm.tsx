import { useState, type FormEvent } from 'react';
import { ApiError, criarCheckin } from '../api';
import type { Checkin } from '../types';
import { apenasDigitos, mascararCpf } from '../utils/cpf';

interface CheckinFormProps {
  onCheckinCriado: (checkin: Checkin) => void;
}

export function CheckinForm({ onCheckinCriado }: CheckinFormProps) {
  const [cpf, setCpf] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const cpfValido = apenasDigitos(cpf).length === 11;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!cpfValido || enviando) return;

    setEnviando(true);
    setErro('');
    setSucesso('');

    try {
      const checkin = await criarCheckin(apenasDigitos(cpf));
      onCheckinCriado(checkin);
      setSucesso(`Check-in realizado: ${checkin.nome}`);
      setCpf('');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível fazer o check-in.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="checkin-form" onSubmit={aoEnviar}>
      <label htmlFor="cpf">CPF do paciente</label>
      <input
        id="cpf"
        value={cpf}
        onChange={(e) => {
          setCpf(mascararCpf(e.target.value));
          setErro('');
          setSucesso('');
        }}
        placeholder="000.000.000-00"
        inputMode="numeric"
        maxLength={14}
        autoFocus
      />
      <button type="submit" disabled={!cpfValido || enviando}>
        {enviando ? 'Enviando...' : 'Fazer check-in'}
      </button>

      {erro && <p className="mensagem mensagem-erro" role="alert">{erro}</p>}
      {sucesso && <p className="mensagem mensagem-sucesso" role="status">{sucesso}</p>}
    </form>
  );
}
