'use client';

import { useEffect, useState } from 'react';
import { useFeedback } from '@/app/components/Feedback';

type Estado =
  | 'cargando'
  | 'sin_configurar'
  | 'no_soportado'
  | 'ios_sin_instalar'
  | 'bloqueado'
  | 'inactivo'
  | 'activo';

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

// La clave pública viene en base64 "URL safe"; el navegador la pide como bytes
function claveABytes(base64: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(normal);
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

function esIphone(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function appInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function soportaPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

const MENSAJES: Partial<Record<Estado, string>> = {
  sin_configurar: 'Las notificaciones todavía no están configuradas en el servidor.',
  no_soportado: 'Este navegador no admite notificaciones.',
  ios_sin_instalar:
    'En iPhone las notificaciones solo funcionan con la app instalada: toca Compartir → «Agregar a pantalla de inicio», abre la app desde su icono y vuelve a esta pantalla.',
  bloqueado:
    'Bloqueaste las notificaciones de este sitio. Para recibirlas, actívalas en los ajustes del navegador y recarga la página.',
};

export default function NotificacionesPush() {
  const { avisar } = useFeedback();
  const [estado, setEstado] = useState<Estado>('cargando');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function revisar() {
      let siguiente: Estado;
      if (!CLAVE_PUBLICA) siguiente = 'sin_configurar';
      else if (!soportaPush()) siguiente = esIphone() && !appInstalada() ? 'ios_sin_instalar' : 'no_soportado';
      else if (Notification.permission === 'denied') siguiente = 'bloqueado';
      else {
        const registro = await navigator.serviceWorker.getRegistration('/sw.js');
        const suscripcion = await registro?.pushManager.getSubscription();
        siguiente = suscripcion ? 'activo' : 'inactivo';
      }
      if (!cancelado) setEstado(siguiente);
    }
    revisar();
    return () => {
      cancelado = true;
    };
  }, []);

  async function activar() {
    setOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        setEstado(permiso === 'denied' ? 'bloqueado' : 'inactivo');
        return;
      }

      const registro = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const suscripcion =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: claveABytes(CLAVE_PUBLICA) as BufferSource,
        }));

      const res = await fetch('/api/push/suscribir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suscripcion.toJSON()),
      });
      if (!res.ok) {
        await suscripcion.unsubscribe();
        avisar('No se pudo activar. Intenta de nuevo.', 'error');
        return;
      }
      setEstado('activo');
      avisar('Notificaciones activadas en este dispositivo.');
    } catch (err) {
      console.error('Error al activar notificaciones:', err);
      avisar('No se pudo activar las notificaciones en este dispositivo.', 'error');
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    try {
      const registro = await navigator.serviceWorker.getRegistration('/sw.js');
      const suscripcion = await registro?.pushManager.getSubscription();
      if (suscripcion) {
        await fetch('/api/push/suscribir', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: suscripcion.endpoint }),
        });
        await suscripcion.unsubscribe();
      }
      setEstado('inactivo');
      avisar('Notificaciones desactivadas en este dispositivo.');
    } catch {
      avisar('No se pudo desactivar. Intenta de nuevo.', 'error');
    } finally {
      setOcupado(false);
    }
  }

  async function probar() {
    setOcupado(true);
    try {
      const res = await fetch('/api/push/probar', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) avisar('No se pudo enviar la prueba. Intenta de nuevo.', 'error');
      else if (data.enviadas > 0) avisar('Prueba enviada. Debería llegarte en unos segundos.');
      else avisar('No hay dispositivos registrados para enviarte la prueba.', 'error');
    } catch {
      avisar('No se pudo conectar. Intenta de nuevo.', 'error');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby="titulo-push" className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 id="titulo-push" className="text-neutral-200 font-bold mb-1">
        Notificaciones de reservas
      </h2>
      <p className="text-sm text-neutral-400 mb-4">
        Recibe un aviso en este dispositivo, con el nombre del cliente y la hora, cada vez que haya
        una reserva o una cancelación en tu agenda.
      </p>

      {estado === 'cargando' && <div className="h-11 rounded-xl bg-neutral-800 animate-pulse" aria-busy="true" />}

      {MENSAJES[estado] && (
        <p className="rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-300">
          {MENSAJES[estado]}
        </p>
      )}

      {estado === 'inactivo' && (
        <button
          onClick={activar}
          disabled={ocupado}
          className="presionable w-full min-h-12 rounded-xl bg-amber-400 font-bold uppercase tracking-wide text-neutral-950 hover:bg-amber-300 disabled:opacity-60"
        >
          {ocupado ? 'Activando...' : 'Activar en este dispositivo'}
        </button>
      )}

      {estado === 'activo' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-amber-400">● Activadas en este dispositivo</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={probar}
              disabled={ocupado}
              className="presionable min-h-11 rounded-xl border border-neutral-700 px-4 text-sm text-neutral-200 hover:border-amber-400 hover:text-amber-400 disabled:opacity-60"
            >
              Enviar prueba
            </button>
            <button
              onClick={desactivar}
              disabled={ocupado}
              className="presionable min-h-11 rounded-xl border border-neutral-700 px-4 text-sm text-red-400 hover:border-red-500 disabled:opacity-60"
            >
              Desactivar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
