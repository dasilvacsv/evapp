// (admin)/customers/[customerId]/_components/document-viewer-modal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string | null;
  documentType: string | null;
  documentName: string | null;
}

export default function DocumentViewerModal({ 
  isOpen, 
  onClose, 
  documentUrl, 
  documentType,
  documentName
}: DocumentViewerModalProps) {

  const isImage = documentType?.startsWith('image/');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{documentName || 'Visor de Documento'}</DialogTitle>
        </DialogHeader>
        
        <div className="my-4 min-h-[60vh] flex items-center justify-center bg-muted/50 rounded-md">
          {!documentUrl ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : isImage ? (
            <img 
              src={documentUrl} 
              alt={documentName || 'Documento'} 
              className="max-w-full max-h-[70vh] object-contain" 
            />
          ) : (
            <div className="text-center p-8">
              <p className="font-semibold text-lg">Vista previa no disponible</p>
              <p className="text-muted-foreground mb-4">
                El archivo "{documentName}" no es una imagen.
              </p>
              <Button asChild>
                <a href={documentUrl} download={documentName}>Descargar Archivo</a>
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {documentUrl && (
             <Button asChild variant="outline">
                <a href={documentUrl} download={documentName}>Descargar</a>
            </Button>
          )}
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}