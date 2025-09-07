// middleware.ts

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth'; // Importa tu configuración principal
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

// Envolvemos la exportación del middleware con el helper 'auth'
export default auth((req) => {
  // 'req.auth' ahora contiene la sesión si el usuario está logueado
  const token = req.auth?.user;
  const isLoggedIn = !!token;
  const path = req.nextUrl.pathname;

  // 1. Si no está logueado, redirigir a /login
  // El 'matcher' de abajo ya se encarga de que este código solo se ejecute en rutas protegidas.
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // 2. Control de acceso basado en roles (con las rutas corregidas)
  const role = token.role as string;
  
  // Super admin puede acceder a todo, no necesita más validaciones.
  if (role === 'super_admin') {
    return NextResponse.next();
  }
  
  // Protección de rutas específicas por rol
  if (path.startsWith('/settings') && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  if (path.startsWith('/team') && !['manager', 'super_admin'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  if (path.startsWith('/processing') && !['processor', 'super_admin'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  if (path.startsWith('/commissions') && !['commission_analyst', 'super_admin'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Si pasa todas las validaciones, permitir el acceso.
  return NextResponse.next();
});

// 3. El 'matcher' ahora apunta a las URLs reales que quieres proteger
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/customers/:path*',
    '/policies/:path*',
    '/team/:path*',
    '/processing/:path*',
    '/commissions/:path*',
    '/settings/:path*',
  ],
};