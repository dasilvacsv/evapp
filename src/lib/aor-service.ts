// lib/aor-service-updated.ts - Servicio AOR actualizado sin Documenso

import { SignatureService } from '@/lib/signature-service';
import { db } from '@/lib/db';
import { customers, users, policies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { formatDateUS } from '@/lib/policy-utils';

interface AORGenerationData {
  customerId: string;
  policyId: string;
  policyData: {
    insuranceCompany: string;
    planName: string;
    marketplaceId?: string;
    effectiveDate?: string;
    monthlyPremium?: string;
  };
  createdByAgentId: string;
}

export class AORService {
  /**
   * Crea y envía un documento AOR usando nuestro sistema de firma propio
   */
  static async createAndSendAOR(data: AORGenerationData): Promise<{ id: string; signingUrl: string; }> {
    try {
      console.log(`Iniciando proceso AOR para cliente ${data.customerId}...`);
      
      // Usar nuestro servicio de firma electrónica
      const result = await SignatureService.createAndSendAOR(data);
      
      console.log('✅ Proceso de AOR completado exitosamente con sistema propio.');
      
      return result;

    } catch (error) {
      console.error('Error creando el documento AOR:', error);
      throw new Error(`No se pudo crear el documento AOR: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Verifica el estado de un documento de firma
   */
  static async getDocumentStatus(documentId: string) {
    try {
      return await SignatureService.getDocumentStatus(documentId);
    } catch (error) {
      console.error(`Error al obtener el estado del documento ${documentId}:`, error);
      throw new Error('No se pudo obtener el estado del documento');
    }
  }

  /**
   * Procesa webhooks de nuestro sistema de firma para actualizar el estado de las pólizas
   */
  static async processSignatureWebhook(eventType: string, documentId: string, policyId?: string) {
    if (!policyId) {
      console.warn(`Webhook ${eventType} recibido sin policyId para documento ${documentId}`);
      return;
    }

    try {
      let newStatus: string | undefined;

      switch (eventType) {
        case 'document.sent':
          newStatus = 'contacting';
          break;
        case 'document.viewed':
          // No cambiar estado, solo registrar
          break;
        case 'document.signed':
          newStatus = 'info_captured';
          break;
        case 'document.completed':
          newStatus = 'approved';
          break;
        case 'document.expired':
        case 'document.cancelled':
          newStatus = 'missing_docs';
          break;
      }

      if (newStatus) {
        await db
          .update(policies)
          .set({ status: newStatus as any, updatedAt: new Date() })
          .where(eq(policies.id, policyId));

        console.log(`✅ Póliza ${policyId} actualizada a estado: ${newStatus}`);
      }
    } catch (error) {
      console.error(`Error procesando webhook ${eventType} para póliza ${policyId}:`, error);
    }
  }
}