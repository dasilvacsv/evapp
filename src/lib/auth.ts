// lib/auth.ts

import NextAuth from 'next-auth';
import { type AuthConfig } from '@auth/core/types';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

import { db } from '@/db';
import { users, accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const authConfig: AuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      
      // MODIFICADO: Callback 'profile' robusto con valores por defecto.
      // Este es el arreglo principal para el error "violates not-null constraint".
      profile(profile) {
        // 1. Extraemos el nombre de usuario del email (ej: 'juanperez' de 'juanperez@gmail.com')
        const username = profile.email?.split('@')[0] ?? `user_${profile.sub.slice(0, 8)}`;
        
        // 2. Definimos valores de respaldo para nombre y apellido.
        // Si Google no nos da un nombre/apellido, lo construimos a partir del nombre completo o del email.
        const fullName = profile.name || username;
        const nameParts = fullName.split(' ');
        
        const firstNameFallback = nameParts[0];
        const lastNameFallback = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '.'; // Un punto como apellido por defecto si no hay más.

        // 3. Devolvemos el objeto de usuario COMPLETO Y VALIDADO, asegurando que ningún campo obligatorio sea nulo.
        return {
          id: profile.sub,
          // Usamos el 'name' como un nombre de usuario, como sugeriste.
          name: username,
          // Usamos el nombre y apellido de Google, O nuestros valores de respaldo.
          firstName: profile.given_name ?? firstNameFallback,
          lastName: profile.family_name ?? lastNameFallback,
          email: profile.email,
          image: profile.picture,
          role: 'agent', // Rol por defecto
        };
      },
    }),
    
    CredentialsProvider({
        // ... tu configuración de CredentialsProvider no cambia ...
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' }
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
                return null;
            }
            const user = await db.query.users.findFirst({
                where: eq(users.email, String(credentials.email).toLowerCase()),
            });
            if (!user || !user.passwordHash) {
                return null;
            }
            const isValidPassword = await bcrypt.compare(
                String(credentials.password),
                user.passwordHash
            );
            if (!isValidPassword) {
                return null;
            }
            return user;
        },
    }),
  ],

  callbacks: {
    // ... tus callbacks de jwt y session no cambian ...
    jwt({ token, user }) {
        if (user) {
            token.id = user.id;
            token.role = (user as any).role;
        }
        return token;
    },
    session({ session, token }) {
        if (session.user) {
            session.user.id = token.id as string;
            session.user.role = token.role as string;
        }
        return session;
    },
  },

  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/login',
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);