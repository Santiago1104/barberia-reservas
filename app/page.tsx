import Link from 'next/link';
import Image from 'next/image';

const redes = [
  { texto: 'WhatsApp: +57 314 8532393', url: 'https://wa.me/573148532393' },
  { texto: 'Instagram: @chapubarber_21', url: 'https://www.instagram.com/chapubarber_21/' },
  { texto: 'Facebook', url: 'https://www.facebook.com/profile.php?id=100068227933784' },
];

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <section style={{ width: '100%', maxWidth: 600, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Image src="/logo.png" alt="Africa Latina Barbershop" width={260} height={260} style={{ borderRadius: 16 }} priority />
        <h1 style={{ fontSize: 28, marginTop: 24, marginBottom: 8, color: '#d4a437' }}>Africa Latina Barbershop</h1>
        <p style={{ fontSize: 18, color: '#dddddd', marginBottom: 32 }}>Cortes americanos y todos los estilos</p>
        <Link href="/reservas" style={{ display: 'inline-block', background: '#d4a437', color: '#1a1a1a', fontWeight: 'bold', fontSize: 18, padding: '16px 40px', borderRadius: 10, textDecoration: 'none' }}>
          Agendar cita
        </Link>
      </section>

      <section style={{ width: '100%', maxWidth: 600, padding: '24px' }}>
        <h2 style={{ color: '#d4a437', fontSize: 22, marginBottom: 16, textAlign: 'center' }}>¿Dónde estamos?</h2>
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #333' }}>
          <iframe
            src="https://www.google.com/maps?q=2.4381109,-76.6081384&z=17&output=embed"
            width="100%"
            height="300"
            style={{ border: 0 }}
            loading="lazy"
          />
        </div>
        <p style={{ textAlign: 'center', marginTop: 12 }}>
          <Link href="https://maps.app.goo.gl/1nPDN3dYNyLsjaHC6" target="_blank" style={{ color: '#d4a437' }}>
            Ver en Google Maps
          </Link>
        </p>
      </section>

      <footer style={{ width: '100%', maxWidth: 600, padding: '24px', textAlign: 'center', borderTop: '1px solid #333', marginTop: 24 }}>
        <h2 style={{ color: '#d4a437', fontSize: 22, marginBottom: 16 }}>Síguenos</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          {redes.map((red) => (
            <Link key={red.url} href={red.url} target="_blank" style={{ color: '#fff', textDecoration: 'none' }}>
              {red.texto}
            </Link>
          ))}
        </div>
        <p style={{ color: '#666', fontSize: 13, marginTop: 24 }}>Africa Latina Barbershop</p>
      </footer>
    </main>
  );
}