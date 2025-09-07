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
      // AÑADIDO: El callback 'profile' para mapear los datos de Google a tu esquema de usuario.
      profile(profile) {
        // 'profile' es el objeto con los datos del usuario de Google.
        // Aquí construimos el objeto que el DrizzleAdapter usará para crear el usuario.
        return {
          id: profile.sub, // 'sub' es el ID único de Google
          name: profile.name, // El nombre completo que espera el adapter
          firstName: profile.given_name, // Mapeamos el nombre de pila
          lastName: profile.family_name, // Mapeamos el apellido
          email: profile.email,
          image: profile.picture,
          role: 'agent', // Asignamos un rol por defecto
          // No incluimos passwordHash, ya que es una cuenta de OAuth
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