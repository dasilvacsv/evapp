// features/whatsapp/actions.ts
'use server'

import { z } from 'zod'

const sendMessageSchema = z.object({
  phoneNumber: z.string().min(8),
  text: z.string().min(1),
})

const sendMessageWithQRSchema = z.object({
  phoneNumber: z.string().min(8),
  text: z.string().min(1),
  image: z.string().min(1),
});

type SendMessageResponse = {
  success: boolean
  error?: string
  data?: any
}

const formatPhoneNumber = (phone: string): string => {
  // El número ya viene con el prefijo de país desde el frontend.
  // La única tarea es limpiar cualquier caracter que no sea un dígito.
  return phone.replace(/\D/g, '');
};

export async function sendWhatsappMessage(
  phoneNumber: string,
  text: string
): Promise<SendMessageResponse> {
  try {
    const messagesEnabled = process.env.MESSAGES_ENABLED === 'true';
    if (!messagesEnabled) {
      console.log('WhatsApp messages are disabled by environment setting');
      return { success: true, data: { skipped: true, reason: 'Messages disabled by environment setting' } };
    }
    
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const validated = sendMessageSchema.parse({ phoneNumber: formattedPhone, text });
    
    const API_BASE_URL = process.env.EVOLUTION_API_URL
    const API_KEY = process.env.EVOLUTION_API_KEY
    const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE
    
    if (!API_BASE_URL || !API_KEY || !INSTANCE_NAME) {
      throw new Error('Missing Evolution API configuration')
    }

    console.log(`Sending WhatsApp message to ${validated.phoneNumber} using instance ${INSTANCE_NAME}...`);
    const response = await fetch(`${API_BASE_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json',
      },
      // --- INICIO DE LA CORRECCIÓN ---
      // El cuerpo (body) ahora es más simple, con "text" en el nivel principal.
      body: JSON.stringify({
        number: validated.phoneNumber,
        text: validated.text,
      }),
      // --- FIN DE LA CORRECCIÓN ---
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Evolution API response error:', error);
      throw new Error(JSON.stringify(error) || 'Failed to send message')
    }

    const data = await response.json()
    return { success: true, data }

  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    }
  }
}

export async function sendWhatsappMessageWithQR(
  phoneNumber: string,
  text: string,
  image: string
): Promise<SendMessageResponse> {
  try {
    const messagesEnabled = process.env.MESSAGES_ENABLED === 'true';
    if (!messagesEnabled) {
      return { success: true, data: { skipped: true, reason: 'Messages disabled by environment setting' } };
    }
    
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const validated = sendMessageWithQRSchema.parse({ phoneNumber: formattedPhone, text, image });
    
    const base64Image = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    // --- Usando los nombres de tu .env ---
    const API_BASE_URL = process.env.EVOLUTION_API_URL
    const API_KEY = process.env.EVOLUTION_API_KEY
    const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE

    if (!API_BASE_URL || !API_KEY || !INSTANCE_NAME) {
      throw new Error('Missing Evolution API configuration')
    }

    const response = await fetch(`${API_BASE_URL}/message/sendMedia/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: validated.phoneNumber,
        options: {
          delay: 1200,
          presence: "composing"
        },
        mediaMessage: {
          mediatype: "image",
          caption: validated.text,
          media: base64Image,
          fileName: `order-${Date.now()}.png`
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(JSON.stringify(error) || 'Failed to send media message')
    }

    const data = await response.json()
    return { success: true, data }

  } catch (error) {
    console.error('Error sending WhatsApp message with QR:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send message with QR' }
  }
}

export async function sendWhatsappMessageWithPDF(
  phoneNumber: string,
  text: string,
  pdfBase64: string,
  fileName: string
): Promise<SendMessageResponse> {
  try {
    const messagesEnabled = process.env.MESSAGES_ENABLED === 'true';
    if (!messagesEnabled) {
      return { success: true, data: { skipped: true, reason: 'Messages disabled by environment setting' } };
    }
    
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    
    // --- Usando los nombres de tu .env ---
    const API_BASE_URL = process.env.EVOLUTION_API_URL
    const API_KEY = process.env.EVOLUTION_API_KEY
    const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE

    if (!API_BASE_URL || !API_KEY || !INSTANCE_NAME) {
      throw new Error('Missing Evolution API configuration')
    }
    
    const requestBody = {
      number: formattedPhone,
      options: {
        delay: 1200,
        presence: "composing"
      },
      mediaMessage: {
        mediatype: "document",
        caption: text,
        media: base64Data,
        fileName: fileName || `document-${Date.now()}.pdf`,
      },
    };
    
    const response = await fetch(`${API_BASE_URL}/message/sendMedia/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData) || `Failed to send PDF document (Status: ${response.status})`)
    }

    const data = await response.json()
    return { success: true, data }

  } catch (error) {
    console.error('Error sending WhatsApp message with PDF:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send message with PDF' }
  }
}