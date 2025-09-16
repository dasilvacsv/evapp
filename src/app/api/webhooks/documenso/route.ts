import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import * as crypto from 'crypto';
import { db } from '@/lib/db';
import { policies } from '@/db/schema'; // Tu esquema de Drizzle
import { eq } from 'drizzle-orm';

// Recuerda configurar esta variable de entorno en Vercel o tu hosting
const WEBHOOK_SECRET = process.env.DOCUMENSO_WEBHOOK_SECRET;

// Definición de la estructura del payload que envía Documenso (más completa)
interface DocumensoWebhookPayload {
  event: 'document.created' | 'document.sent' | 'document.opened' | 'document.signed' | 'document.completed' | 'document.rejected' | 'document.cancelled';
  data: {
    documentId: string;
    title: string;
    status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
    recipients: Array<{
      id: string;
      email: string;
      name: string;
      signingStatus: 'NOT_SIGNED' | 'SIGNED';
    }>;
    meta?: {
      policyId?: string; // ✅ El ID de la póliza es clave aquí
      [key: string]: any;
    };
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
}

// --- FUNCIÓN PRINCIPAL DEL WEBHOOK ---

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const signature = headersList.get('x-documenso-signature');
    
    // 1. Validar que la firma y el secreto existan
    if (!signature || !WEBHOOK_SECRET) {
      console.error('Webhook secret or signature is missing.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.text();
    
    // 2. Verificar la firma (seguridad HMAC)
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== `sha256=${expectedSignature}`) {
      console.error('Invalid webhook signature.');
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }

    const payload: DocumensoWebhookPayload = JSON.parse(body);
    console.log(`✅ Webhook received: ${payload.event}`);

    // 3. Procesar el evento según su tipo
    switch (payload.event) {
      case 'document.created':
        await handleDocumentCreated(payload);
        break;
      case 'document.sent':
        await handleDocumentSent(payload);
        break;
      case 'document.opened':
        await handleDocumentOpened(payload);
        break;
      case 'document.signed':
        await handleDocumentSigned(payload);
        break;
      case 'document.completed':
        await handleDocumentCompleted(payload);
        break;
      case 'document.rejected':
      case 'document.cancelled':
        await handleDocumentRejectedOrCancelled(payload);
        break;
      default:
        console.warn(`Unhandled event type: ${payload.event}`);
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error processing Documenso webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- LÓGICA DETALLADA PARA CADA EVENTO ---

/**
 * Cuando se crea un documento en Documenso.
 * Lógica: Guardamos el ID del documento en la póliza para tener una referencia.
 */
async function handleDocumentCreated(payload: DocumensoWebhookPayload) {
  const { policyId } = payload.data.meta || {};
  const { documentId } = payload.data;

  if (!policyId) return console.warn(`'document.created' event received without a policyId.`);
  
  console.log(`Linking document ${documentId} to policy ${policyId}...`);
  try {
    // Asumiendo que tu tabla 'policies' tiene un campo 'aorLink' o similar
    await db
      .update(policies)
      .set({ aorLink: `documenso_id:${documentId}` }) 
      .where(eq(policies.id, policyId));
    console.log(`✅ Policy ${policyId} updated with AOR link.`);
  } catch (error) {
    console.error(`DB Error on document.created for policy ${policyId}:`, error);
  }
}

/**
 * Cuando el documento es enviado a los firmantes.
 * Lógica: Actualizamos el estado de la póliza a 'sent_to_carrier'.
 */
async function handleDocumentSent(payload: DocumensoWebhookPayload) {
  const { policyId } = payload.data.meta || {};

  if (!policyId) return console.warn(`'document.sent' event received without a policyId.`);

  console.log(`Document sent for policy ${policyId}. Updating status...`);
  try {
    await db
      .update(policies)
      .set({ status: 'sent_to_carrier' }) // Tu `policyStatusEnum` debe incluir este estado
      .where(eq(policies.id, policyId));
    console.log(`✅ Policy ${policyId} status updated to 'sent_to_carrier'.`);
  } catch (error) {
    console.error(`DB Error on document.sent for policy ${policyId}:`, error);
  }
}

/**
 * Cuando un destinatario abre el documento.
 * Lógica: Útil para seguimiento, no requiere acción en la BD.
 */
async function handleDocumentOpened(payload: DocumensoWebhookPayload) {
  const { policyId } = payload.data.meta || {};
  console.log(`📄 Document for policy ${policyId || 'N/A'} was opened.`);
}

/**
 * Cuando uno de los destinatarios firma el documento.
 * Lógica: Útil para auditoría, especialmente con múltiples firmantes.
 */
async function handleDocumentSigned(payload: DocumensoWebhookPayload) {
  const { policyId } = payload.data.meta || {};
  const signedRecipient = payload.data.recipients.find(r => r.signingStatus === 'SIGNED');
  console.log(`✍️ Document for policy ${policyId || 'N/A'} was signed by ${signedRecipient?.email}.`);
}

/**
 * Cuando TODOS los destinatarios han firmado el documento.
 * Lógica: ¡El paso clave! La póliza se activa.
 */
async function handleDocumentCompleted(payload: DocumensoWebhookPayload) {
  const { policyId } = payload.data.meta || {};

  if (!policyId) return console.warn(`'document.completed' event received without a policyId.`);
  
  console.log(`Document for policy ${policyId} is complete. Activating policy...`);
  try {
    const result = await db
      .update(policies)
      .set({ status: 'active' }) // Tu `policyStatusEnum` debe incluir 'active'
      .where(eq(policies.id, policyId))
      .returning({ updatedId: policies.id });

    if (result.length > 0) {
      console.log(`🎉 Policy ${result[0].updatedId} is now active!`);
    } else {
      console.error(`Policy with ID ${policyId} not found during completion.`);
    }
  } catch (error) {
    console.error(`DB Error on document.completed for policy ${policyId}:`, error);
  }
}

/**
 * Cuando el documento es rechazado o cancelado.
 * Lógica: Revertimos el estado de la póliza para tomar acciones correctivas.
 */
async function handleDocumentRejectedOrCancelled(payload: DocumensoWebhookPayload) {
  const { policyId } = payload.data.meta || {};
  const newStatus = payload.event === 'document.rejected' ? 'rejected' : 'cancelled';

  if (!policyId) return console.warn(`'${payload.event}' event received without a policyId.`);

  console.log(`Document for policy ${policyId} was ${newStatus}. Updating status...`);
  try {
    // Tu `policyStatusEnum` debe incluir 'rejected' y 'cancelled'
    await db
      .update(policies)
      .set({ status: newStatus as 'rejected' | 'cancelled' })
      .where(eq(policies.id, policyId));
    console.log(`❌ Policy ${policyId} status updated to '${newStatus}'.`);
  } catch (error)
  {
    console.error(`DB Error on ${payload.event} for policy ${policyId}:`, error);
  }
}

// Bloquear otros métodos HTTP como GET para mayor seguridad
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}