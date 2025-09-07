'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import Link from "next/link";
import { signInAction, signUpAction } from '.';
import ShimmerButton from '@/components/ui/shimmer-button';
import { FormMessage,Message } from '@/features/core/FormMessage';


export default function AuthForm({ searchParams }: { searchParams: Message }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAuth = () => setIsLogin(!isLogin);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const action = isLogin ? signInAction : signUpAction;
    try {
      await action(new FormData(event.currentTarget));
    } finally {
      setIsSubmitting(false);
    }
  };

  if ("message" in searchParams && !isLogin) {
    return (
      <div className="w-full flex-1 flex items-center justify-center gap-2">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="space-y-4">
        <CardTitle className="text-2xl font-bold">
          {isLogin ? 'Bienvenido de vuelta' : 'Crear nueva cuenta'}
        </CardTitle>
        <CardDescription>
          {isLogin 
            ? "¡Bienvenido! Por favor ingresa tus datos." 
            : "Vamos a configurar tu cuenta"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Ingresa tu nombre"
                  className="h-12"
                  required 
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="Ingresa tu correo electrónico"
                className="h-12"
                required 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Contraseña</Label>
                {isLogin && (
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Ingresa tu contraseña"
                  className="h-12 pr-10"
                  minLength={isLogin ? undefined : 6}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-12 w-12"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <ShimmerButton 
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg">
                  {isSubmitting 
                    ? (isLogin ? "Iniciando sesión..." : "Creando cuenta...") 
                    : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
                </span>
              </ShimmerButton>
            </div>

            <p className="text-center text-sm text-gray-600">
              {isLogin ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}{' '}
              <Button 
                variant="link" 
                className="p-0 text-red-500 hover:text-red-600" 
                onClick={toggleAuth}
              >
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </Button>
            </p>
            
            <FormMessage message={searchParams} />
          </motion.form>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}