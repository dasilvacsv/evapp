// app/sign/success/page.tsx - Página de éxito de firma con UI/UX mejorada para EV FINANCIAL

import { CheckCircle, Download, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// Datos para la sección de "próximos pasos" para fácil mantenimiento
const nextSteps = [
  {
    icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    text: 'Se ha enviado una copia del documento firmado a su correo electrónico.',
  },
  {
    icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    text: 'Su firma digital ha sido registrada con validez legal y de forma segura.',
  },
  {
    icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    text: 'Todas las partes involucradas han sido notificadas automáticamente.',
  },
];

export default function SignSuccessPage() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-lg shadow-xl animate-fade-in">
        <CardHeader className="text-center items-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            ¡Firma Completada!
          </CardTitle>
          <CardDescription className="text-base text-slate-600 dark:text-slate-400 pt-1">
            Su documento ha sido firmado y procesado de forma segura.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 py-8">
          {/* Sección de Próximos Pasos */}
          <div className="space-y-4 rounded-lg border bg-slate-50 dark:bg-slate-800/50 p-6">
            <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-200">¿Qué sucede ahora?</h3>
            <ul className="space-y-3">
              {nextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-1">{step.icon}</span>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{step.text}</p>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Acciones para el usuario */}
          <div className="flex flex-col sm:flex-row gap-4">
            
            <Button asChild variant="secondary" className="w-full" size="lg">
               {/* Deberías apuntar al endpoint de descarga de tu documento */}
              <Link href="/path/to/your/document.pdf" download>
                <Download className="h-4 w-4 mr-2" />
                Descargar Copia
              </Link>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex-col items-center text-center pt-6 border-t">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              Si tiene alguna pregunta, contacte a nuestro equipo de soporte.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} EV FINANCIAL. Todos los derechos reservados.
            </p>
        </CardFooter>
      </Card>
    </main>
  );
}