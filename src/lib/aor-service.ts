import { renderToBuffer } from '@react-pdf/renderer';
import { AORTemplate } from './aor-pdf-template'; // Tu componente de React para el PDF
import { documensoClient, DocumensoDocument } from './documenso'; // Importamos el tipo también
import { db } from './db';
import { customers, users, policies } from '@/db/schema'; // ✅ Importamos `policies`
import { eq } from 'drizzle-orm';

// ✅ CAMBIO 1: Agregamos `policyId` que es CRÍTICO para el webhook.
interface AORGenerationData {
  customerId: string;
  policyId: string; // <-- Esencial para enlazar el documento a la póliza
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
   * Genera un PDF de AOR para un cliente específico.
   * (Este método no necesita cambios, ya está bien)
   */
  static async generateAORPDF(data: AORGenerationData): Promise<Buffer> {
    // Obtener información del cliente y del agente de la BD
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
      },
      agent: {
        fullName: agent.name || `${agent.firstName} ${agent.lastName}`,
        email: agent.email,
        // licenseNumber: agent.licenseNumber, // Ejemplo
      },
      policy: data.policyData,
      createdAt: new Date(),
    };

    const pdfBuffer = await renderToBuffer(AORTemplate({ data: aorData }));
    return Buffer.from(pdfBuffer);
  }

  /**
   * ✅ CAMBIO 2: Lógica principal refactorizada, simplificada y corregida.
   * Ahora usa el nuevo método del documensoClient, actualiza la BD y es más eficiente.
   */
  static async createAndSendAOR(data: AORGenerationData): Promise<DocumensoDocument> {
    try {
      // 1. Obtener la información del cliente (solo una vez)
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, data.customerId),
      });

      if (!customer?.email) {
        throw new Error('El cliente debe tener un email para recibir el documento');
      }

      // 2. Generar el PDF
      console.log(`Generando PDF para ${customer.fullName}...`);
      const pdfBuffer = await this.generateAORPDF(data);

      // 3. Usar el nuevo método para crear y enviar el documento en un solo paso
      console.log(`Enviando AOR a Documenso para la póliza ${data.policyId}...`);
      const sentDocument = await documensoClient.createAndSendAorDocument({
        title: `AOR - ${customer.fullName} - ${data.policyData.insuranceCompany}`,
        policyId: data.policyId, // <-- Pasamos el ID de la póliza
        customerId: data.customerId,
        recipient: {
          email: customer.email,
          name: customer.fullName,
        },
        documentBuffer: pdfBuffer,
        fileName: `AOR_${customer.fullName.replace(/\s+/g, '_')}.pdf`,
      });

      // 4. (IMPORTANTE) Guardar la referencia del documento en nuestra base de datos
      console.log(`Actualizando la póliza ${data.policyId} con el ID del documento ${sentDocument.id}...`);
      await db
        .update(policies)
        .set({ aorLink: sentDocument.id }) // Guardamos el ID de Documenso
        .where(eq(policies.id, data.policyId));
        
      console.log('✅ Proceso de AOR completado exitosamente.');
      return sentDocument;

    } catch (error) {
      console.error('Error creando el documento AOR:', error);
      throw new Error(`Failed to create AOR document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verifica el estado de un documento de Documenso (útil para comprobaciones manuales).
   * (Este método no necesita cambios)
   */
  static async getDocumentStatus(documentId: string) {
    try {
      const document = await documensoClient.getDocument(documentId);
      return { status: document.status };
    } catch (error) {
      console.error(`Error al obtener el estado del documento ${documentId}:`, error);
      throw new Error('Failed to fetch document status');
    }
  }
}