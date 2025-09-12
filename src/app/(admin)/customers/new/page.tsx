'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFullApplicationSchema, FullApplicationFormData } from '../schemas';
import { createFullApplication } from '../actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// UI Components
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

// Form Sections and the Stepper component
import CustomerFormSection from './_components/customer-form-section';
import DependentsFormSection from './_components/dependents-form-section';
import PolicyFormSection from './_components/policy-form-section';
import PaymentFormSection from './_components/payment-form-section';
import FormStepper from './_components/form-stepper';

const steps = [
  { id: 'Titular', name: 'Información y Documentos', fields: ['customer', 'documents'] },
  { id: 'Dependientes', name: 'Dependientes', fields: ['dependents'] },
  { id: 'Póliza', name: 'Datos de la Póliza', fields: ['policy'] },
  { id: 'Pago', name: 'Información de Pago', fields: ['payment'] },
];

export default function NewCustomerPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FullApplicationFormData>({
    resolver: zodResolver(createFullApplicationSchema),
    mode: 'onChange',
    defaultValues: {
      customer: {
        fullName: "", email: "", phone: "", address: "", county: "", state: "", ssn: "",
        zipCode: "",
        income: undefined, declaresOtherPeople: false, appliesToCoverage: true,
      },
      dependents: [],
      policy: {
        insuranceCompany: "",
        planName: "",
        marketplaceId: "",
        monthlyPremium: undefined,
        taxCredit: undefined,
        planLink: "", aorLink: "", notes: "",
      },
      documents: [],
      payment: {
        methodType: undefined, cardHolderName: "", cardNumber: "", expirationDate: "",
        cvv: "", bankName: "", routingNumber: "", accountNumber: "",
      }
    },
  });

  async function handleNextStep() {
    const fieldsToValidate = steps[currentStep].fields;
    // @ts-ignore
    const isValid = await form.trigger(fieldsToValidate);

    if (!isValid) {
      const errorState = form.formState.errors;
      let errorCount = 0;
      if (fieldsToValidate.includes('customer') && errorState.customer) errorCount += Object.keys(errorState.customer).length;
      if (fieldsToValidate.includes('policy') && errorState.policy) errorCount += Object.keys(errorState.policy).length;
      if (fieldsToValidate.includes('payment') && errorState.payment) errorCount += Object.keys(errorState.payment).length;
      if (fieldsToValidate.includes('dependents') && errorState.dependents) errorCount += Array.isArray(errorState.dependents) ? errorState.dependents.length : 1;
      
      toast({
        variant: "destructive",
        title: "Campos Incompletos",
        description: `Por favor, corrige ${errorCount} ${errorCount === 1 ? 'error' : 'errores'} antes de continuar.`,
      });
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }

  function handlePrevStep() {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }

  async function onSubmit(data: FullApplicationFormData) {
    setIsSubmitting(true);
    const finalData = { ...data };

    try {
      const result = await createFullApplication(finalData);
      
      if (result.success) {
        toast({ title: "✅ Éxito", description: "La aplicación ha sido creada." });
        router.push(`/customers/${result.data?.customerId}`);
      } else {
        toast({ variant: "destructive", title: "❌ Error", description: result.message || "No se pudo crear la aplicación." });
        console.error("Error en createFullApplication:", result);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "❌ Error inesperado", description: "Ocurrió un error. Inténtalo de nuevo." });
      console.error("Error inesperado:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-12 max-w-4xl mx-auto">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-center">Nueva Aplicación de Cliente</h1>
        <div className="pb-10">
          <FormStepper steps={steps} currentStep={currentStep} />
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className={currentStep === 0 ? 'block' : 'hidden'}>
            <CustomerFormSection formControl={form.control} setFormValue={form.setValue} />
          </div>
          <div className={currentStep === 1 ? 'block' : 'hidden'}>
            <DependentsFormSection formControl={form.control} setFormValue={form.setValue} />
          </div>
          <div className={currentStep === 2 ? 'block' : 'hidden'}>
            <PolicyFormSection formControl={form.control} />
          </div>
          <div className={currentStep === 3 ? 'block' : 'hidden'}>
            <PaymentFormSection formControl={form.control} />
          </div>

          {/* Debug info - remover en producción */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
              <p><strong>Debug Info:</strong></p>
              <p>Paso actual: {currentStep}</p>
              <p>Formulario válido: {form.formState.isValid ? 'Sí' : 'No'}</p>
              <p>Errores: {Object.keys(form.formState.errors).length}</p>
              {Object.keys(form.formState.errors).length > 0 && (
                <pre className="mt-2">{JSON.stringify(form.formState.errors, null, 2)}</pre>
              )}
            </div>
          )}

          {/* Botones de Navegación */}
          <div className="flex justify-between pt-10 mt-8 border-t">
            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 0 || isSubmitting}>
              Anterior
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={handleNextStep} disabled={isSubmitting}>
                Siguiente
              </Button>
            ) : (
              // 👇 CAMBIO: Se modifica el botón para tener control explícito del envío
              <Button 
                type="button" 
                size="lg"
                onClick={form.handleSubmit(onSubmit)}
                disabled={!form.formState.isValid || isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Finalizar y Crear Aplicación
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}