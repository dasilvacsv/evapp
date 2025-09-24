// app/sign/[token]/page.tsx - Página pública para firmar documentos (Corregida y con funcionalidad de descarga)
'use client';

import { useState, useEffect, useRef, createRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { DateField } from '@/components/ui/date-field';
import { Loader2, FileText, CheckCircle, AlertCircle, Clock, ArrowRight, ShieldCheck, ClipboardCheck, Download } from 'lucide-react';
import SignaturePad from '@/components/signature-pad';

// --- Interfaces ---
interface DocumentField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  value?: string;
}

interface SignerData {
  id: string;
  name: string;
  email: string;
  status: string;
  document: {
    id: string;
    title: string;
    status: string;
    customer?: {
      fullName: string;
    };
    expiresAt?: string;
  };
  fields: DocumentField[];
  expired?: boolean;
}


export default function SignDocumentPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  // Estados principales
  const [signer, setSigner] = useState<SignerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Estados para el flujo guiado
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [hasAgreed, setHasAgreed] = useState(false);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Estados para la descarga
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fieldRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);

  // --- Lógica de Carga de Datos y Descarga ---

  const fetchDownloadUrl = useCallback(async (attempt = 1) => {
    if (!token) return;
    setIsFetchingUrl(true);
    setFetchError(null);

    try {
        const response = await fetch(`/api/signature/download/${token}`);
        const data = await response.json();

        if (response.ok && data.success && data.url) {
            setDownloadUrl(data.url);
            setIsFetchingUrl(false);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            return;
        }

        // Si el documento está en proceso, seguimos intentando
        if (response.status === 202 && attempt < 10) { // Intentar 10 veces (20 segundos)
            pollingIntervalRef.current = setTimeout(() => fetchDownloadUrl(attempt + 1), 2000);
        } else {
            setFetchError(data.message || 'No se pudo obtener el enlace de descarga. Por favor, recargue la página.');
            setIsFetchingUrl(false);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        }
    } catch (err) {
        setFetchError('Error de red al intentar obtener el documento.');
        setIsFetchingUrl(false);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    }
  }, [token]);

  // Limpiar el intervalo si el componente se desmonta
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (token) loadSignerData();
  }, [token, fetchDownloadUrl]);
  
  const loadSignerData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/signature/signer/${token}`);
        const data = await response.json();
        if (response.ok && data.signer) {
          const signerData: SignerData = data.signer;
          setSigner(signerData);
          initializeFieldValues(signerData);
          fieldRefs.current = signerData.fields.map(() => createRef<HTMLDivElement>());

          if (signerData.status === 'signed' && signerData.document.status === 'completed') {
            fetchDownloadUrl();
          }

          if (signerData.status === 'sent') markAsViewed(signerData);
        } else {
          setError(data.message || 'Documento no encontrado o el enlace no es válido.');
        }
      } catch (err) {
        setError('Error al conectar con el servidor.');
      } finally {
        setLoading(false);
      }
  };
  
  const initializeFieldValues = (signerData: SignerData) => {
      const initialValues: Record<string, string> = {};
      signerData.fields.forEach((field) => {
        let value = field.value || '';
        if (field.type === 'name') value = signerData.name;
        else if (field.type === 'email') value = signerData.email;
        else if (field.type === 'date') value = new Date().toISOString().split('T')[0];
        initialValues[field.id] = value;
      });
      setFieldValues(initialValues);
  };
  
  const markAsViewed = async (signerData: SignerData) => {
     if (signerData.status === 'sent') {
       try {
         await fetch('/api/signature/webhook', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             eventType: 'document.viewed',
             documentId: signerData.document.id,
             signerId: signerData.id,
             data: {
               signerToken: token,
               userAgent: navigator.userAgent,
             },
           }),
         });
       } catch (error) {
         console.error('Error marcando como visto:', error);
       }
     }
  };

  // --- Lógica del Flujo Guiado ---
  const requiredFields = useMemo(() => signer?.fields.filter(f => f.required) || [], [signer]);
  const completedRequiredFields = useMemo(() => {
    return requiredFields.filter(field => fieldValues[field.id]?.trim()).length;
  }, [fieldValues, requiredFields]);

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    setValidationErrors(prevErrors => {
      if (prevErrors[fieldId]) {
        const newErrors = { ...prevErrors };
        delete newErrors[fieldId];
        return newErrors;
      }
      return prevErrors;
    });
  }, []);

  const memoizedEventHandlers = useMemo(() => {
    if (!signer?.fields) return {};
    const handlers: Record<string, (value: any) => void> = {};
    signer.fields.forEach(field => {
      handlers[field.id] = (value: any) => handleFieldChange(field.id, value || '');
    });
    return handlers;
  }, [signer?.fields, handleFieldChange]);


  const findNextIncompleteField = (startIndex = -1): number | null => {
    if (!signer) return null;
    const nextIndex = signer.fields.findIndex(
      (field, index) => index > startIndex && field.required && !fieldValues[field.id]?.trim()
    );
    return nextIndex !== -1 ? nextIndex : null;
  };

  const scrollToField = (index: number | null) => {
    if (index === null) {
        setActiveFieldIndex(null);
        return;
    };
    setActiveFieldIndex(index);
    setTimeout(() => {
        fieldRefs.current[index]?.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }, 100);
  };
  
  const handleStart = () => {
    setWorkflowStarted(true);
    const firstIncomplete = findNextIncompleteField();
    scrollToField(firstIncomplete);
  };

  const handleNext = () => {
    if (activeFieldIndex === null) return;
    const currentField = signer!.fields[activeFieldIndex];
    if (currentField.required && !fieldValues[currentField.id]?.trim()) {
      setValidationErrors(prev => ({ ...prev, [currentField.id]: true }));
      return;
    }
    const nextField = findNextIncompleteField(activeFieldIndex);
    scrollToField(nextField ?? null);
  };
  
  const handleSubmit = async () => {
    if (!signer) return;
    setError(null);
    setValidationErrors({});

    const missingFields = signer.fields.filter(field => field.required && !fieldValues[field.id]?.trim());

    if (missingFields.length > 0) {
      const firstMissingId = missingFields[0].id;
      const firstMissingIndex = signer.fields.findIndex(f => f.id === firstMissingId);
      const newErrors = missingFields.reduce((acc, field) => ({...acc, [field.id]: true}), {});
      setValidationErrors(newErrors);
      setError(`Por favor, complete ${missingFields.length} campo(s) obligatorio(s).`);
      scrollToField(firstMissingIndex);
      return;
    }

    setSigning(true);
    try {
      const response = await fetch('/api/signature/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerToken: token, fieldValues }),
      });
      const result = await response.json();
      if (result.success) {
        setShowSuccess(true);
        fetchDownloadUrl();
      } else {
        setError(result.message || 'Ocurrió un error al firmar el documento.');
      }
    } catch (error) {
      setError('Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setSigning(false);
    }
  };

  const renderStatusScreen = (
    icon: React.ReactNode, 
    title: string, 
    message: string, 
    subtext?: string,
    showDownloadButton: boolean = false
  ) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-xl animate-fade-in border-0">
        <CardContent className="p-8">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gray-100 mb-5">{icon}</div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-600 mt-2 text-base">{message}</p>
          {subtext && <p className="text-sm text-gray-500 mt-4">{subtext}</p>}

          {showDownloadButton && (
            <div className='mt-8'>
              {isFetchingUrl && (
                <div className='flex items-center justify-center text-gray-500'>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Preparando su copia segura...</span>
                </div>
              )}
              {fetchError && !isFetchingUrl && (
                  <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{fetchError}</AlertDescription></Alert>
              )}
              {downloadUrl && !isFetchingUrl && (
                <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-5 w-5 mr-2" />
                        Descargar Copia Firmada
                    </a>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (loading) return renderStatusScreen(<Loader2 className="h-10 w-10 animate-spin text-blue-600" />, "Cargando Documento", "Estamos preparando todo de forma segura. Un momento...");
  if (error && !signer) return renderStatusScreen(<AlertCircle className="h-10 w-10 text-red-600" />, "Error", error);
  if (showSuccess) return renderStatusScreen(<CheckCircle className="h-10 w-10 text-green-600" />, "¡Documento Firmado!", "Su firma ha sido registrada. Puede cerrar esta ventana o descargar una copia de su documento.", "Gracias por utilizar nuestros servicios.", true);
  if (!signer) return null;
  if (signer.expired) return renderStatusScreen(<Clock className="h-10 w-10 text-yellow-600" />, "Enlace Expirado", "Este enlace de firma ha caducado.", "Por favor, contacte al remitente para solicitar uno nuevo.");
  if (signer.status === 'signed') return renderStatusScreen(<CheckCircle className="h-10 w-10 text-green-600" />, "Ya Firmado", "Este documento ya ha sido firmado por usted. Puede descargar una copia a continuación.", "Si necesita una copia, contacte al remitente.", true);
  
  const isReadyToFinish = completedRequiredFields === requiredFields.length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white/90 backdrop-blur-lg border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center space-x-3 self-start sm:self-center">
              <FileText className="h-7 w-7 text-blue-600 flex-shrink-0" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{signer.document.title}</h1>
                <p className="text-xs text-gray-600">Enviado por EV FINANCIAL para {signer.name}</p>
              </div>
            </div>
            {workflowStarted && (
              <div className='w-full sm:w-1/3 md:w-1/4'>
                <div className='flex justify-between items-baseline mb-1'>
                  <p className='text-xs font-medium text-blue-700'>Progreso</p>
                  <p className='text-xs text-gray-600'>{completedRequiredFields} de {requiredFields.length}</p>
                </div>
                <Progress value={(completedRequiredFields / requiredFields.length) * 100} className="h-2" />
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32">
        {!workflowStarted ? (
          <Card className="animate-fade-in shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <ClipboardCheck className='h-8 w-8 text-blue-600' /> Revise y Firme el Documento
              </CardTitle>
              <CardDescription className="pt-2">{signer.document.customer?.fullName} le ha invitado a firmar este documento. Por favor, lea y acepte los términos para continuar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-start space-x-3">
                  <Checkbox id="terms" checked={hasAgreed} onCheckedChange={(checked) => setHasAgreed(checked as boolean)} className="mt-1" />
                  <label htmlFor="terms" className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Acepto usar registros y firmas electrónicas y confirmo que he revisado el documento y la información contenida en él es correcta.
                  </label>
                </div>
              </div>
            </CardContent>
            <CardFooter><Button size="lg" disabled={!hasAgreed} onClick={handleStart}>Empezar a Firmar <ArrowRight className="h-5 w-5 ml-2" /></Button></CardFooter>
          </Card>
        ) : (
          <div className="space-y-10 animate-fade-in">
            {signer.fields.map((field, index) => (
              <div key={field.id} ref={fieldRefs.current[index]} className={`p-1 -m-1 rounded-xl transition-all duration-300 ${activeFieldIndex === index ? 'ring-2 ring-blue-500 ring-offset-8 ring-offset-gray-50' : ''}`}>
                <Card className={`shadow-md border transition-all ${validationErrors[field.id] ? 'border-red-500 shadow-red-100' : 'border-gray-200'}`}>
                  <CardContent className="p-6">
                    <label className="block text-base font-semibold text-gray-800 mb-3">
                      {field.label} {field.required && <span className="text-red-600 font-normal">*</span>}
                    </label>
                    
                    {field.type === 'signature' ? (
                      <SignaturePad onSignatureChange={memoizedEventHandlers[field.id]} />
                    ) : field.type === 'date' ? (
                      <DateField value={fieldValues[field.id] || ''} onChange={memoizedEventHandlers[field.id]} />
                    ) : field.type === 'textarea' ? (
                      <Textarea value={fieldValues[field.id] || ''} onChange={(e) => handleFieldChange(field.id, e.target.value)} required={field.required} rows={4} />
                    ) : (
                      <Input type={field.type === 'email' ? 'email' : 'text'} value={fieldValues[field.id] || ''} onChange={(e) => handleFieldChange(field.id, e.target.value)} required={field.required} readOnly={['name', 'email'].includes(field.type)} className={['name', 'email'].includes(field.type) ? 'bg-gray-100 cursor-not-allowed' : ''} />
                    )}

                    {validationErrors[field.id] && <p className='text-sm text-red-600 mt-2'>Este campo es obligatorio.</p>}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {workflowStarted && (
        <footer className="bg-white/90 backdrop-blur-lg border-t sticky bottom-0 z-20 py-4">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className='w-full sm:w-auto flex-grow'>
              {error && (<Alert variant="destructive" className="p-2 text-sm"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>)}
            </div>
            <div className="flex items-center space-x-4 w-full sm:w-auto flex-shrink-0">
              {isReadyToFinish ? (
                <Button size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={signing}>
                  {signing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                  {signing ? 'Finalizando...' : 'Finalizar y Firmar'}
                </Button>
              ) : (
                <Button size="lg" className="w-full sm:w-auto" onClick={handleNext}>Siguiente <ArrowRight className="h-5 w-5 ml-2" /></Button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
