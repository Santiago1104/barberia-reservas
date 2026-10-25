// Cada vez que cambias de sección del panel, el contenido entra con un fundido suave
// (la cabecera de navegación no se vuelve a animar)
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="anim-entrar">{children}</div>;
}
