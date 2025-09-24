// app/api/signature/webhook/route.ts - API para webhooks de firma

import { NextRequest, NextResponse } from 'next/server';
import { SignatureService } from '@/lib/signature-service';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, documentId, signerId, data } = body;

    console.log(`Webhook recibido: ${eventType} para documento ${documentId}`);

    // Procesar diferentes tipos de eventos
    switch (eventType) {
      case 'document.viewed':
        if (data?.ipAddress && data?.userAgent) {
          await SignatureService.markDocumentAsViewed(
            data.signerToken, 
            data.ipAddress, 
            data.userAgent
          );
        }
        break;

      case 'document.signed':
        // Este evento se maneja internamente cuando se procesa la firma
        console.log(`Documento ${documentId} firmado por ${signerId}`);
        break;

      case 'document.completed':
        console.log(`Documento ${documentId} completado`);
        break;

      case 'document.expired':
        // Marcar documento como expirado
        console.log(`Documento ${documentId} expirado`);
        break;

      default:
        console.log(`Evento no manejado: ${eventType}`);
    }

    return NextResponse.json({ success: true, message: 'Webhook procesado' });

  } catch (error) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno' },
      { status: 500 }
    );
  }
}