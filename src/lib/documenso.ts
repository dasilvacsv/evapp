/**
 * Documenso API Integration
 * Handles document creation, template management, and signing workflows
 */

const DOCUMENSO_API_KEY = process.env.DOCUMENSO_API_KEY;
const DOCUMENSO_BASE_URL = process.env.DOCUMENSO_BASE_URL || 'https://app.documenso.com';

// --- INTERFACES ---
interface DocumensoDocument {
  id: string;
  title: string;
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

interface DocumensoRecipient {
  id: string;
  email: string;
  name: string;
  role: 'SIGNER' | 'VIEWER' | 'APPROVER';
  signingStatus: 'NOT_SIGNED' | 'SIGNED';
}

interface CreateDocumentRequest {
  title: string;
  recipients: Array<{
    email: string;
    name: string;
    role: 'SIGNER' | 'VIEWER' | 'APPROVER';
  }>;
  documentBuffer: Buffer;
  fileName: string;
  templateId?: string;
  meta?: {
    policyId: string;
    customerId: string;
  };
}


// --- CLIENTE DE LA API ---

class DocumensoClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!DOCUMENSO_API_KEY) {
      throw new Error('DOCUMENSO_API_KEY environment variable is not set.');
    }
    this.apiKey = DOCUMENSO_API_KEY;
    this.baseUrl = DOCUMENSO_BASE_URL;
  }

  // ✅ MÉTODO AUXILIAR RESTAURADO: Centraliza las peticiones a la API
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/api/v1${endpoint}`; // Ruta base de la API v1
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createDocument(request: CreateDocumentRequest): Promise<DocumensoDocument> {
    const formData = new FormData();
    formData.append('title', request.title);
    formData.append('recipients', JSON.stringify(request.recipients));
    formData.append('document', new Blob([request.documentBuffer]), request.fileName);
    if (request.meta) {
      formData.append('meta', JSON.stringify(request.meta));
    }
    if (request.templateId) {
        formData.append('templateId', request.templateId);
    }

    const response = await fetch(`${this.baseUrl}/api/v1/document`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` }, // No 'Content-Type' aquí, el navegador lo pone por FormData
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Documenso API Error:", error);
      throw new Error(`Failed to create document: ${response.status}`);
    }
    return response.json();
  }

  async sendDocument(documentId: string): Promise<DocumensoDocument> {
    return this.request(`/document/${documentId}/send`, { method: 'POST' });
  }
  
  async createAndSendAorDocument(data: {
    title: string;
    policyId: string;
    customerId: string;
    recipient: { email: string; name: string };
    documentBuffer: Buffer;
    fileName: string;
  }): Promise<DocumensoDocument> {
    const createdDocument = await this.createDocument({
      title: data.title,
      recipients: [{ ...data.recipient, role: 'SIGNER' }],
      documentBuffer: data.documentBuffer,
      fileName: data.fileName,
      meta: {
        policyId: data.policyId,
        customerId: data.customerId,
      },
    });

    return this.sendDocument(createdDocument.id);
  }

  // ✅ MÉTODO RESTAURADO
  async getDocument(documentId: string): Promise<DocumensoDocument> {
    return this.request(`/document/${documentId}`);
  }

  // ✅ MÉTODO RESTAURADO
  async getDocumentRecipients(documentId: string): Promise<DocumensoRecipient[]> {
    return this.request(`/document/${documentId}/recipients`);
  }

  // ✅ MÉTODO RESTAURADO DEL CÓDIGO ORIGINAL
  async createTemplate(templateData: {
    title: string;
    documentBuffer: Buffer;
    fileName: string;
    fields: Array<{
      type: 'SIGNATURE' | 'DATE' | 'TEXT' | 'EMAIL' | 'NAME';
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      recipientId: string;
    }>;
  }) {
    const formData = new FormData();
    formData.append('title', templateData.title);
    formData.append('document', new Blob([templateData.documentBuffer]), templateData.fileName);
    formData.append('fields', JSON.stringify(templateData.fields));

    const response = await fetch(`${this.baseUrl}/api/v1/template`, { // Endpoint actualizado a v1
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create template: ${response.status} - ${error}`);
    }

    return response.json();
  }
  
  // ✅ MÉTODO RESTAURADO DEL CÓDIGO ORIGINAL
  async listTemplates() {
    return this.request('/template'); // Endpoint actualizado a v1
  }
}

export const documensoClient = new DocumensoClient();
export type { DocumensoDocument, DocumensoRecipient, CreateDocumentRequest };