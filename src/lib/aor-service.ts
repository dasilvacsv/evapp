// services/AORService.ts

import * as ReactPDF from '@react-pdf/renderer';
import { AORTemplate } from './aor-pdf-template';
import { documensoClient } from './documenso';
import { db } from './db';
import { customers, users, policies } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
   * Genera un PDF de AOR para un cliente específico de forma eficiente en el servidor.
   */
  static async generateAORPDF(data: AORGenerationData): Promise<Buffer> {
    const [customer, agent] = await Promise.all([
      db.query.customers.findFirst({ where: eq(customers.id, data.customerId) }),
      db.query.users.findFirst({ where: eq(users.id, data.createdByAgentId) })
    ]);

    if (!customer) throw new Error('Cliente no encontrado');
    if (!agent) throw new Error('Agente no encontrado');

    const aorData = {
      customer: {
        fullName: customer.fullName,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        address: customer.address || undefined,
        ssn: customer.ssn || undefined,
        birthDate: customer.birthDate || undefined,
      },
      agent: {
        fullName: agent.name || `${agent.firstName} ${agent.lastName}`,
        email: agent.email,
      },
      policy: data.policyData,
      createdAt: new Date(),
    };

    // --- CÓDIGO CORREGIDO ---
    // Se usa renderToStream para un mejor rendimiento en el servidor.
    const pdfStream = await ReactPDF.renderToStream(AORTemplate({ data: aorData }));

    // Se convierte el stream resultante a un Buffer.
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      pdfStream.on('data', (chunk) => chunks.push(chunk));
      pdfStream.on('end', () => resolve(Buffer.concat(chunks)));
      pdfStream.on('error', reject);
    });

    return pdfBuffer;
  }

  /**
   * Crea y envía un documento AOR usando Documenso con mejoras.
   */
  static async createAndSendAOR(data: AORGenerationData): Promise<{ id: string; signingUrl: string; }> {
    try {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, data.customerId),
      });

      if (!customer?.email) {
        throw new Error('El cliente debe tener un email para recibir el documento');
      }

      console.log(`Generando PDF para ${customer.fullName}...`);
      const pdfBuffer = await this.generateAORPDF(data);

      console.log(`Enviando AOR a Documenso para la póliza ${data.policyId}...`);

      /*
       * Se usa @ts-ignore porque la definición de tipos de Documenso puede ser incorrecta (pide Buffer).
       * La API en realidad necesita una string en Base64, por lo que convertimos el buffer.
       */
      // @ts-ignore
      const document = await documensoClient.createAndSendAorDocument({
        title: `AOR - ${customer.fullName} - ${data.policyData.insuranceCompany}`,
        policyId: data.policyId,
        customerId: data.customerId,
        recipient: {
          email: customer.email,
          name: customer.fullName,
        },
        documentBuffer: pdfBuffer.toString('base64'),
        fileName: `AOR_${customer.fullName.replace(/\s+/g, '_')}.pdf`,
      });

      await db
        .update(policies)
        .set({
          aorDocumentId: document.id,
          status: 'contacting'
        })
        .where(eq(policies.id, data.policyId));

      console.log('✅ Proceso de AOR completado exitosamente.');

      return {
        id: document.id,
        signingUrl: `https://app.documenso.com/sign/${document.id}`,
      };

    } catch (error) {
      console.error('Error creando el documento AOR:', error);
      throw new Error(`Failed to create AOR document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verifica el estado de un documento de Documenso.
   */
  static async getDocumentStatus(documentId: string) {
    try {
      const document = await documensoClient.getDocument(documentId);
      return {
        status: document.status,
        isCompleted: document.status === 'COMPLETED',
        isPending: document.status === 'PENDING',
      };
    } catch (error) {
      console.error(`Error al obtener el estado del documento ${documentId}:`, error);
      throw new Error('Failed to fetch document status');
    }
  }

  /**
   * Procesa webhooks de Documenso para actualizar el estado de las pólizas.
   */
  static async processDocumensoWebhook(eventType: string, documentId: string, policyId?: string) {
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
        case 'document.opened':
          break;
        case 'document.signed':
          newStatus = 'info_captured';
          break;
        case 'document.completed':
          newStatus = 'approved';
          break;
        case 'document.rejected':
        case 'document.cancelled':
          newStatus = 'missing_docs';
          break;
      }

      if (newStatus) {
        await db
          .update(policies)
          .set({ status: newStatus as any })
          .where(eq(policies.id, policyId));

        console.log(`✅ Póliza ${policyId} actualizada a estado: ${newStatus}`);
      }
    } catch (error) {
      console.error(`Error procesando webhook ${eventType} para póliza ${policyId}:`, error);
    }
  }
}