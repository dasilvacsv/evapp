// app/page.tsx

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth'; // 1. Importa el helper de autenticación

export default async function Home() {
  // 2. Obtiene la sesión del servidor
  const session = await auth();

  // 3. Redirige según el estado de la sesión
  if (session?.user) {
    redirect('/dashboard'); // Si hay sesión, va al dashboard
  } else {
    redirect('/login'); // Si no hay sesión, va a la página de login
  }
}