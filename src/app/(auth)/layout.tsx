// app/(auth)/layout.tsx

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El layout ahora es un simple contenedor que no interfiere
  // con el diseño de la página, ya que la página misma
  // gestiona su estructura de pantalla completa.
  return <>{children}</>;
}