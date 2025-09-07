'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

// Componentes y Acciones
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { checkUserExists, registerUser } from '@/app/actions/auth.actions';

// Iconos
import { Mail, Lock, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc'; 

// Tipos para los pasos
type AuthStep = 'email' | 'password' | 'register';

export function OnboardingAuthForm() {
  const [step, setStep] = useState<AuthStep>('email');
  
  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const result = await checkUserExists(email);
      if (result.exists) {
        setStep('password');
      } else {
        setStep('register');
      }
    } catch (err) {
      setError("No se pudo verificar el correo. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false, // Usamos redirect: false para manejar el error aquí mismo
    });

    if (result?.error) {
      setError('Contraseña incorrecta o el usuario no existe.');
      setLoading(false);
    } else {
      // Si el inicio de sesión es exitoso, redirigimos manualmente
      window.location.href = '/dashboard';
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await registerUser({ firstName, lastName, email, password });
    
    if (result.success) {
      // Si el registro es exitoso, intentamos iniciar sesión automáticamente
      const loginResult = await signIn('credentials', { email, password, redirect: false });
      if (loginResult?.error) {
        // Si el auto-login falla, le pedimos que inicie sesión manualmente (esto es un caso raro)
        setError("Cuenta creada. Por favor, inicia sesión.");
        setStep('password');
        setLoading(false);
      } else {
        // Si el auto-login es exitoso, redirigimos
        window.location.href = '/dashboard';
      }
    } else {
      setError(result.error || 'No se pudo completar el registro.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setLoading(true); // Muestra el spinner mientras redirige a Google
    signIn('google', { callbackUrl: '/dashboard' });
  };
  
  const goBack = () => {
    setError(null);
    setPassword('');
    setStep('email');
  };

  const slideAnimation = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div key="email" {...slideAnimation}>
              <CardHeader>
                <CardTitle className="text-2xl">Te damos la bienvenida</CardTitle>
                <CardDescription>Ingresa tu correo para continuar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <><FcGoogle className="mr-2 h-5 w-5" /> Continuar con Google</>}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">O</span></div>
                </div>
                <form onSubmit={handleEmailSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" type="email" placeholder="tu@email.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                  </div>
                  <Button type="submit" className="w-full mt-4" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : "Continuar"}
                  </Button>
                </form>
              </CardContent>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.div key="password" {...slideAnimation}>
              <CardHeader>
                <button onClick={goBack} className="text-sm text-muted-foreground flex items-center mb-2 disabled:opacity-50" disabled={loading}><ArrowLeft className="h-4 w-4 mr-1"/> Volver</button>
                <CardTitle className="text-2xl">Ingresa tu contraseña</CardTitle>
                <CardDescription>Iniciando sesión como <span className="font-medium text-primary">{email}</span></CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="password">Contraseña</Label>
                    <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={loading} autoFocus />
                  </div>
                  {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : "Iniciar Sesión"}
                  </Button>
                </form>
              </CardContent>
            </motion.div>
          )}

          {step === 'register' && (
            <motion.div key="register" {...slideAnimation}>
              <CardHeader>
                <button onClick={goBack} className="text-sm text-muted-foreground flex items-center mb-2 disabled:opacity-50" disabled={loading}><ArrowLeft className="h-4 w-4 mr-1"/> Volver</button>
                <CardTitle className="text-2xl">Completa tu registro</CardTitle>
                <CardDescription>Creando una nueva cuenta para <span className="font-medium text-primary">{email}</span></CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input id="firstName" required value={firstName} onChange={e => setFirstName(e.target.value)} disabled={loading} />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input id="lastName" required value={lastName} onChange={e => setLastName(e.target.value)} disabled={loading} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password">Crea una contraseña</Label>
                    <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                  </div>
                  {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : "Crear mi cuenta"}
                  </Button>
                </form>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
        <CardFooter className="text-xs text-center text-muted-foreground pt-4">
          Al continuar, aceptas nuestros <a href="#" className="underline">Términos de Servicio</a> y <a href="#" className="underline">Política de Privacidad</a>.
        </CardFooter>
      </Card>
    </div>
  );
}