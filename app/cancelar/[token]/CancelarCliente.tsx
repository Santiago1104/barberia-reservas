'use client';

import { useState } from 'react';

export default function CancelarCliente({
  token,
  estado,
  fecha,
  hora,
  nombreCliente,
  barbero,
  servicio,
}: {
  token: string;
  estado: string;
  fecha: string;
  hora: string;
  nombreCliente: string;
  barbero: string;
  servicio: string;
}) {
  const [cancelando, setCancelando] = useState(false);
  const [resultado, setResultado] = useState<'ok' | string | null>(
    estado === 'cancelada' ? 'ya_cancelada' : null
  );

  async function cancelar() {
    setCancelando(true);
    try {
      const res = await fetch('/api/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setCancelando(false);
      setResultado(res.ok ? 'ok' : data.error);
    } catch {
      setCancelando(false);
      setResultado('error_conexion');
    }
  }

  const contenedor = { maxWidth: 500, margin: '80px auto', padding: 20, color: '#1F3864' };

  // Ya cancelada (antes o ahora)
  if (resultado === 'ok' || resultado === 'ya_cancelada') {
    return (
      <div style={contenedor}>
        <h1>Reserva cancelada</h1>
        <p>
          {resultado === 'ok'
            ? 'Tu cita fue cancelada correctamente.'
            : 'Esta cita ya estaba cancelada.'}
        </p>
      </div>
    );
  }

  return (
    <div style={contenedor}>
      <h1>Cancelar reserva</h1>
      <div
        style={{
          padding: 16,
          borderRadius: 8,
          border: '1px solid #ccc',
          background: '#fff',
          marginTop: 16,
        }}
      >
        <p>Hola {nombreCliente}, esta es tu cita:</p>
        <p>
          <strong>{barbero}</strong> — {servicio}
          <br />
          {fecha} a las {hora}
        </p>
      </div>

      {resultado === 'fuera_de_plazo' && (
        <p style={{ color: '#c0392b', marginTop: 12 }}>
          Ya no es posible cancelar (debe hacerse al menos 30 minutos antes).
          Por favor comunícate con la barbería.
        </p>
      )}
      {resultado === 'error_cancelar' || resultado === 'error_conexion' ? (
        <p style={{ color: '#c0392b', marginTop: 12 }}>
          Ocurrió un error. Intenta de nuevo.
        </p>
      ) : null}

      <button
        onClick={cancelar}
        disabled={cancelando}
        style={{
          marginTop: 16,
          padding: '14px 24px',
          borderRadius: 8,
          border: 'none',
          background: '#c0392b',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 16,
        }}
      >
        {cancelando ? 'Cancelando...' : 'Sí, cancelar mi cita'}
      </button>
    </div>
  );
}