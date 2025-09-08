// (admin)/customers/new/_components/documents-form-section.tsx

'use client';

import { useState, useRef, useMemo } from "react";
import { UseFormSetValue } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast"; // Ruta estándar de shadcn/ui
import { generatePresignedUrlForUpload, deleteFileFromS3 } from "../../actions";
import { 
    UploadCloud, 
    File as FileIcon, 
    Loader2, 
    Trash2,
    CheckCircle2,
    AlertCircle,
    FileImage, 
    FileText 
} from "lucide-react";

// --- TIPOS Y PROPS ---

interface Props {
  // Recibimos la función `setValue` del formulario principal para actualizar su estado.
  setFormValue: UseFormSetValue<FullApplicationFormData>;
}

// Tipo extendido para manejar el estado de cada archivo individualmente.
type UploadedFile = {
  s3Key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  // Nuevo: Estado de la carga para feedback en tiempo real.
  status: 'uploading' | 'success' | 'error'; 
};

// --- FUNCIONES AUXILIARES ---

// Formatea el tamaño del archivo a un formato legible (B, KB, MB).
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Devuelve un ícono apropiado según el tipo de archivo.
const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-5 w-5 flex-shrink-0 text-gray-500" />;
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5 flex-shrink-0 text-gray-500" />;
    return <FileIcon className="h-5 w-5 flex-shrink-0 text-gray-500" />;
};

// --- COMPONENTE PRINCIPAL ---

export default function DocumentsFormSection({ setFormValue }: Props) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  // Estado para gestionar el feedback visual durante la carga global.
  const [isUploading, setIsUploading] = useState(false);
  // Estado para el feedback visual de la zona de "arrastrar y soltar".
  const [isDraggingOver, setIsDraggingOver] = useState(false); 
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoizamos el componente de la lista para evitar re-renderizados innecesarios.
  const uploadedFilesList = useMemo(() => (
    <div className="space-y-3 pt-4">
      {uploadedFiles.length > 0 && <p className="text-sm font-medium text-gray-700">Archivos Cargados:</p>}
      {uploadedFiles.map(file => (
        <div key={file.s3Key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 overflow-hidden">
            {getFileIcon(file.fileType)}
            <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-gray-800" title={file.fileName}>{file.fileName}</span>
                <span className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {file.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
            {file.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {file.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" title="Error en la carga" />}
            <Button type="button" size="icon" variant="ghost" onClick={() => handleFileDelete(file.s3Key)} aria-label={`Eliminar ${file.fileName}`}>
              <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  ), [uploadedFiles]); // Se actualiza solo si `uploadedFiles` cambia.

  // --- MANEJADORES DE EVENTOS ---

  const handleFileSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newFilesToUpload: UploadedFile[] = Array.from(files).map(file => ({
        s3Key: `${Date.now()}-${file.name}`, // Clave temporal única para el renderizado
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        status: 'uploading',
    }));
    
    // Añade los archivos a la lista con estado 'uploading' para feedback inmediato.
    setUploadedFiles(prev => [...prev, ...newFilesToUpload]);

    const uploadPromises = Array.from(files).map(async (file, index) => {
      try {
        // 1. Pedir permiso (URL prefirmada) a nuestro backend.
        const presignedResult = await generatePresignedUrlForUpload({
          fileName: file.name,
          fileType: file.type,
        });

        if (!presignedResult.success || !presignedResult.data) {
          throw new Error(presignedResult.error || 'Error al obtener URL prefirmada.');
        }
        
        const { url, fields, key } = presignedResult.data;
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => formData.append(key, value as string));
        formData.append("file", file);

        // 2. Subir el archivo directamente a S3 desde el navegador.
        const response = await fetch(url, { method: "POST", body: formData });

        if (!response.ok) {
            throw new Error('Error en la subida a S3.');
        }

        // Si la subida fue exitosa, actualizamos el estado del archivo.
        const successfulFile: UploadedFile = { s3Key: key, fileName: file.name, fileType: file.type, fileSize: file.size, status: 'success' };
        
        setUploadedFiles(prev => prev.map(f => f.s3Key === newFilesToUpload[index].s3Key ? successfulFile : f));

        return { success: true, file };
      } catch (error) {
        // En caso de error, actualizamos el estado del archivo a 'error'.
        setUploadedFiles(prev => prev.map(f => f.s3Key === newFilesToUpload[index].s3Key ? { ...f, status: 'error' } : f));
        return { success: false, file };
      }
    });

    // Esperamos a que todas las subidas terminen.
    const results = await Promise.all(uploadPromises);

    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.length - successfulCount;

    if (successfulCount > 0) {
        toast({ title: `✅ ${successfulCount} archivo(s) subido(s) con éxito.` });
    }
    if (failedCount > 0) {
        toast({ variant: "destructive", title: `❌ Falló la subida de ${failedCount} archivo(s).` });
    }
    
    // 3. Actualizamos el estado del formulario principal al finalizar todas las cargas.
    setFormValue("documents", uploadedFiles.filter(f => f.status === 'success'), { shouldValidate: true });
    setIsUploading(false);

    // Limpiar el valor del input para permitir subir el mismo archivo de nuevo si se borra.
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleFileDelete = async (s3KeyToDelete: string) => {
    // Confirmación para evitar borrados accidentales.
    const confirmed = window.confirm("¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.");
    if (!confirmed) return;

    try {
      await deleteFileFromS3(s3KeyToDelete);
      
      const updatedFiles = uploadedFiles.filter(f => f.s3Key !== s3KeyToDelete);
      setUploadedFiles(updatedFiles);
      setFormValue("documents", updatedFiles, { shouldValidate: true });

      toast({ title: "Archivo eliminado", description: "El archivo ha sido borrado permanentemente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar el archivo. Inténtalo de nuevo." });
    }
  };
  
  // --- DRAG AND DROP HANDLERS ---
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necesario para que el evento `onDrop` funcione.
    setIsDraggingOver(true);
  };
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
  };
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    handleFileSelection(event.dataTransfer.files);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>4. Documentos</CardTitle>
        <CardDescription>Sube documentos de identidad, comprobantes de ingresos, etc.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Área para Cargar Archivos (Dropzone) */}
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
                p-8 border-2 border-dashed rounded-lg text-center transition-all duration-300 cursor-pointer
                ${isDraggingOver ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
                ${isUploading ? 'cursor-not-allowed opacity-70' : ''}
            `}
        >
            <div className="flex flex-col items-center pointer-events-none"> {/* Evita que los hijos capturen el click */}
                <UploadCloud className="h-12 w-12 text-gray-400" />
                <span className="mt-4 text-base font-semibold text-primary">
                    {isUploading ? 'Procesando archivos...' : 'Arrastra y suelta tus archivos aquí'}
                </span>
                <p className="mt-1 text-sm text-gray-500">
                    o <span className="font-semibold text-primary">haz clic para seleccionar</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Puedes seleccionar múltiples archivos a la vez.</p>
            </div>
            <Input 
                ref={fileInputRef} 
                id="file-upload" 
                type="file" 
                multiple 
                className="sr-only" 
                onChange={(e) => handleFileSelection(e.target.files)} 
                disabled={isUploading}
            />
        </div>

        {/* Lista de archivos ya subidos */}
        {uploadedFilesList}
      </CardContent>
    </Card>
  );
}