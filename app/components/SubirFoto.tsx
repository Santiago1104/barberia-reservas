'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFeedback } from './Feedback';

const MAX_ORIGINAL_MB = 15; // fotos del celular pesan varios MB; luego se reducen
const LADO_FINAL = 640; // la foto queda cuadrada de hasta 640 x 640

// Recorta la foto a cuadrado (centrada) y la reduce: sube más rápido, ocupa menos
// y todos los barberos quedan con fotos del mismo formato.
async function prepararFoto(file: File): Promise<File> {
  try {
    const imagen = await createImageBitmap(file);
    const lado = Math.min(imagen.width, imagen.height);
    const salida = Math.min(lado, LADO_FINAL);
    const lienzo = document.createElement('canvas');
    lienzo.width = salida;
    lienzo.height = salida;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(
      imagen,
      (imagen.width - lado) / 2,
      (imagen.height - lado) / 2,
      lado,
      lado,
      0,
      0,
      salida,
      salida
    );
    imagen.close();
    const blob = await new Promise<Blob | null>((resolver) =>
      lienzo.toBlob(resolver, 'image/jpeg', 0.85)
    );
    return blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file; // formato que el navegador no puede leer: se sube tal cual
  }
}

// Selector de foto: círculo con vista previa, botón claro y arrastrar y soltar
export default function SubirFoto({
  archivo,
  fotoActual,
  onCambiar,
}: {
  archivo: File | null;
  fotoActual: string | null;
  onCambiar: (archivo: File | null) => void;
}) {
  const { avisar } = useFeedback();
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const vistaPrevia = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  const imagen = vistaPrevia ?? fotoActual;

  async function recibir(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      avisar('Elige una imagen (JPG, PNG…).', 'error');
      return;
    }
    if (file.size > MAX_ORIGINAL_MB * 1024 * 1024) {
      avisar(`La foto pesa demasiado (máximo ${MAX_ORIGINAL_MB} MB).`, 'error');
      return;
    }
    setProcesando(true);
    onCambiar(await prepararFoto(file));
    setProcesando(false);
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          recibir(e.dataTransfer.files?.[0]);
        }}
        aria-label={imagen ? 'Cambiar la foto' : 'Subir una foto'}
        className={`presionable group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 bg-neutral-950 ${
          arrastrando
            ? 'border-amber-400 bg-amber-400/10'
            : imagen
            ? 'border-neutral-600 hover:border-amber-400'
            : 'border-dashed border-neutral-600 hover:border-amber-400'
        }`}
      >
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagen} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mx-auto text-neutral-400 group-hover:text-amber-400"
          >
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        )}
        {procesando && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/60" aria-label="Procesando foto">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="3" opacity="0.25" />
              <path d="M21 12a9 9 0 00-9-9" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
        )}
      </button>

      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={procesando}
          className="presionable inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400 px-4 text-sm font-bold text-amber-400 hover:bg-amber-400 hover:text-neutral-950 disabled:opacity-60"
        >
          {imagen ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {archivo && (
          <button
            type="button"
            onClick={() => onCambiar(null)}
            className="min-h-9 text-sm text-neutral-400 hover:text-red-400"
          >
            Quitar la foto elegida
          </button>
        )}
        <p className="text-xs text-neutral-400">
          {archivo ? 'Lista para guardar.' : 'JPG o PNG. Se ajusta sola a un cuadrado.'}
        </p>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          recibir(e.target.files?.[0]);
          e.target.value = ''; // permite volver a elegir la misma foto
        }}
      />
    </div>
  );
}
