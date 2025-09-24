// app/policies/components/AorLinkManager.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getClientCopyLink, getSignedAorUrl } from '../../customers/actions';
import { toast } from 'sonner';
import { Copy, Download, Link as LinkIcon, Loader2, Share2 } from 'lucide-react';

interface AorLinkManagerProps {
  policyId: string;
  initialAorLink: string | null;
  aorStatus: string | null;
}

export default function AorLinkManager({ policyId, initialAorLink, aorStatus }: AorLinkManagerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopySignLink = async () => {
    if (!initialAorLink) return;
    await navigator.clipboard.writeText(initialAorLink);
    toast.success('Enlace de firma copiado al portapapeles.');
  };

  const handleDownloadAdminCopy = async () => {
    setIsDownloading(true);
    const result = await getSignedAorUrl(policyId);
    if (result.success && result.url) {
      window.open(result.url, '_blank');
    } else {
      toast.error(result.message || 'No se pudo generar el enlace de descarga.');
    }
    setIsDownloading(false);
  };

  const handleCopyClientLink = async () => {
    setIsCopying(true);
    const result = await getClientCopyLink(policyId);
    if (result.success && result.url) {
      await navigator.clipboard.writeText(result.url);
      toast.success('Enlace para el cliente copiado al portapapeles.');
    } else {
      toast.error(result.message || 'No se pudo generar el enlace para el cliente.');
    }
    setIsCopying(false);
  };

  if (!initialAorLink) {
    return null;
  }

  const isCompleted = aorStatus === 'completed';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon className="mr-2 h-4 w-4" />
          {isCompleted ? 'AOR Firmado' : 'Gestionar AOR'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isCompleted ? (
          <>
            <DropdownMenuItem onClick={handleDownloadAdminCopy} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              <span>Descargar (Admin)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyClientLink} disabled={isCopying}>
              {isCopying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              <span>Copiar enlace del cliente</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopySignLink}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copiar enlace de firma original</span>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={handleCopySignLink}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copiar enlace de firma</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}