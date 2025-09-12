// (admin)/customers/new/_components/file-uploader.tsx

'use client';

import { useState, useRef, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generatePresignedUrlForUpload, deleteFileFromS3 } from "../../actions";
import {
    UploadCloud, File as FileIcon, Loader2, Trash2,
    CheckCircle2, AlertCircle, FileImage, FileText
} from "lucide-react";

// --- TIPOS Y PROPS ---
type UploadedFile = {
    s3Key: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    // status no necesita estar en el schema, es solo para el estado de la UI
    status?: 'uploading' | 'success' | 'error';
};

interface Props {
    uploadedFiles: UploadedFile[];
    onFilesChange: (files: Omit<UploadedFile, 'status'>[]) => void;
}

// --- FUNCIONES AUXILIARES ---
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-5 w-5 flex-shrink-0 text-gray-500" />;
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5 flex-shrink-0 text-gray-500" />;
    return <FileIcon className="h-5 w-5 flex-shrink-0 text-gray-500" />;
};


export default function FileUploader({ uploadedFiles = [], onFilesChange }: Props) {
    const [localFiles, setLocalFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Sincroniza el estado local cuando las props cambian
        setLocalFiles(uploadedFiles.map(f => ({ ...f, status: 'success' })));
    }, [uploadedFiles]);

    const handleFileSelection = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsUploading(true);
        
        const filesToUpload = Array.from(files).map(file => ({
            s3Key: `temp_${Date.now()}_${file.name}`, // Clave temporal para la UI
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            status: 'uploading' as const,
        }));

        setLocalFiles(prev => [...prev, ...filesToUpload]);

        const uploadPromises = filesToUpload.map(async (tempFile) => {
            try {
                const fileObject = Array.from(files).find(f => f.name === tempFile.fileName && f.size === tempFile.fileSize)!;
                const presignedResult = await generatePresignedUrlForUpload({
                    fileName: fileObject.name,
                    fileType: fileObject.type,
                });

                if (!presignedResult.success || !presignedResult.data) {
                    throw new Error(presignedResult.error || 'Error al obtener URL prefirmada.');
                }
                
                const { url, fields, key } = presignedResult.data;
                const formData = new FormData();
                Object.entries(fields).forEach(([key, value]) => formData.append(key, value as string));
                formData.append("file", fileObject);
                
                const response = await fetch(url, { method: "POST", body: formData });
                if (!response.ok) throw new Error('Error en la subida a S3.');

                return { ...tempFile, s3Key: key, status: 'success' as const };
            } catch (error) {
                console.error(error);
                return { ...tempFile, status: 'error' as const };
            }
        });

        const results = await Promise.all(uploadPromises);
        
        // Actualiza el estado local con los resultados
        setLocalFiles(prev => prev.map(f => results.find(r => r.s3Key === f.s3Key || r.fileName === f.fileName) || f));
        
        // Notifica al formulario padre con los archivos exitosos
        const finalSuccessfulFiles = [...uploadedFiles, ...results.filter(r => r.status === 'success')]
            .map(({ status, ...rest }) => rest); // Quitamos la propiedad `status`
            
        onFilesChange(finalSuccessfulFiles);
        
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileDelete = async (s3KeyToDelete: string) => {
        if (!window.confirm("¿Seguro que quieres eliminar este archivo?")) return;
        try {
            await deleteFileFromS3(s3KeyToDelete);
            const updatedFiles = localFiles.filter(f => f.s3Key !== s3KeyToDelete);
            setLocalFiles(updatedFiles);
            onFilesChange(updatedFiles.map(({ status, ...rest }) => rest));
            toast({ title: "Archivo eliminado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error al eliminar" });
        }
    };

    // --- DRAG AND DROP HANDLERS ---
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDraggingOver(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDraggingOver(false); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleFileSelection(e.dataTransfer.files);
    };

    return (
        <div className="space-y-4">
            <div
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-lg text-center transition-all duration-300 cursor-pointer 
                ${isDraggingOver ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
                ${isUploading ? 'cursor-not-allowed opacity-70' : ''}`}
            >
                <div className="flex flex-col items-center pointer-events-none">
                    <UploadCloud className="h-10 w-10 text-gray-400" />
                    <span className="mt-3 text-sm font-semibold text-primary">
                        {isUploading ? 'Procesando...' : 'Arrastra archivos o haz clic'}
                    </span>
                    <p className="mt-1 text-xs text-gray-500">Puedes seleccionar múltiples archivos</p>
                </div>
                <Input ref={fileInputRef} type="file" multiple className="sr-only" onChange={(e) => handleFileSelection(e.target.files)} disabled={isUploading} />
            </div>

            <div className="space-y-2">
                {localFiles.map(file => (
                    <div key={file.s3Key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {getFileIcon(file.fileType)}
                            <div className="flex flex-col overflow-hidden">
                                <span className="truncate text-sm font-medium" title={file.fileName}>{file.fileName}</span>
                                <span className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {file.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin" />}
                            {file.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                            {file.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                            <Button type="button" size="icon" variant="ghost" onClick={() => handleFileDelete(file.s3Key)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}