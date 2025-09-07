// /next-auth.d.ts

import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /**
   * Extiende el objeto Session para incluir propiedades personalizadas.
   */
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user']; // Mantiene las propiedades por defecto (name, email, image)
  }

  /**
   * Extiende el objeto User para que coincida con lo que devuelves en `authorize`.
   */
  interface User {
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extiende el token JWT para incluir propiedades personalizadas.
   */
  interface JWT {
    id: string;
    role: string;
  }
}