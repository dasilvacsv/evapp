'use client'

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DefaultValues,
  FieldValues,
  Path,
  SubmitHandler,
  useForm,
  UseFormReturn,
} from "react-hook-form";
import { ZodType } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, User, Lock, Building2, ArrowRight, Mail } from 'lucide-react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { FIELD_NAMES, FIELD_TYPES } from './contants';
import { BranchCombobox } from './components/BranchCombobox'; // Asegúrate que la ruta sea correcta

// Helper para mapear nombres de campos a íconos
const FIELD_ICONS: { [key: string]: React.ElementType } = {
  email: Mail,
  password: Lock,
  name: User,
  branchId: Building2,
};

interface Props<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
}

const AuthForm = <T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
}: Props<T>) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form: UseFormReturn<T> = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await onSubmit(data);

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Has iniciado sesión correctamente.",
        });
        router.push("/");
      } else {
        toast({
          title: "Error al iniciar sesión",
          description: result.error ?? "Ha ocurrido un error.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const standardFields = Object.keys(defaultValues);

  const renderField = (fieldName: string) => {
    const Icon = FIELD_ICONS[fieldName] || User;
    const isPasswordField = fieldName === 'password';
    const isBranchField = fieldName === 'branchId'; // <-- Cambio clave: detectar el campo de sucursal

    return (
      <FormField
        key={fieldName}
        control={form.control}
        name={fieldName as Path<T>}
        render={({ field }) => (
          <FormItem>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              {FIELD_NAMES[fieldName as keyof typeof FIELD_NAMES]}
            </label>
            <div className="relative">
              {/* No mostrar el ícono para el combobox, ya que tiene su propio estilo */}
              {!isBranchField && (
                <Icon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
              )}
              <FormControl>
                {/* --- INICIO DE LA LÓGICA CONDICIONAL --- */}
                {isBranchField ? (
                  <BranchCombobox
                    value={field.value as number | undefined}
                    onChange={field.onChange}
                  />
                ) : (
                  <Input
                    required
                    type={
                      isPasswordField
                        ? (showPassword ? 'text' : 'password')
                        : FIELD_TYPES[fieldName as keyof typeof FIELD_TYPES]
                    }
                    {...field}
                    className="w-full pl-12 pr-4 py-4 h-auto bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    placeholder={`Ingresa tu ${FIELD_NAMES[fieldName as keyof typeof FIELD_NAMES]?.toLowerCase()}`}
                  />
                )}
                {/* --- FIN DE LA LÓGICA CONDICIONAL --- */}
              </FormControl>
              {isPasswordField && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors h-10 w-10 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </Button>
              )}
            </div>
            <FormMessage className="text-red-400 text-xs mt-1" />
          </FormItem>
        )}
      />
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative w-20 h-20 mx-auto mb-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-2xl rotate-6 shadow-xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl -rotate-6 shadow-xl"></div>
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-slate-700 rounded-2xl h-full w-full flex items-center justify-center shadow-xl">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-white mb-2"
          >
            Bienvenido de nuevo
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-blue-200"
          >
            Accede al sistema de gestión
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {standardFields.map(renderField)}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>
          </Form>

          {/* Client Portal Link Section */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-4">
                ¿Eres cliente? Accede a tu casillero
              </p>
              <Link
                href="/client/sign-in"
                className="inline-flex items-center gap-2 text-blue-300 hover:text-white font-medium transition-colors group"
              >
                Portal de Cliente
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </motion.div>
        <div className="mt-8 text-center">
          <p className="text-xs text-blue-300">
            PoboxManager 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;