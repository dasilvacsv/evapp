
import { Document, Font, Page, StyleSheet, Text, View, Image } from '@react-pdf/renderer'
import { formatDate } from '@/lib/utils'
import path from 'path';

const fontPath = path.join(process.cwd(), 'public', 'fonts');

// Registrar fuentes
Font.register({
  family: 'Inter',
  fonts: [
    { src: `${fontPath}/Inter-Regular.ttf` },
    { src: `${fontPath}/Inter-Medium.ttf`, fontWeight: 500 },
    { src: `${fontPath}/Inter-SemiBold.ttf`, fontWeight: 600 },
    { src: `${fontPath}/Inter-Bold.ttf`, fontWeight: 700 }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
    textTransform: 'uppercase',
    borderBottom: '1 solid #333',
    paddingBottom: 5,
  },
  paragraph: {
    marginBottom: 12,
    textAlign: 'justify',
  },
  boldText: {
    fontWeight: 700,
  },
  underlineText: {
    textDecoration: 'underline',
  },
  clientInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: '30%',
    fontWeight: 600,
  },
  infoValue: {
    width: '70%',
  },
  authorizationBox: {
    border: '2 solid #333',
    padding: 20,
    marginVertical: 20,
    backgroundColor: '#f8f9fa',
  },
  signatureSection: {
    marginTop: 40,
    borderTop: '1 solid #ccc',
    paddingTop: 30,
  },
  signatureBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureField: {
    width: '45%',
    borderBottom: '1 solid #333',
    paddingBottom: 20,
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: 600,
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1 solid #ccc',
    paddingTop: 10,
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
  },
  companyInfo: {
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
    marginBottom: 20,
  },
})

interface AORData {
  customer: {
    fullName: string;
    email?: string;
    phone?: string;
    address?: string;
    ssn?: string;
    birthDate?: string;
  };
  agent: {
    fullName: string;
    email?: string;
    licenseNumber?: string;
  };
  policy: {
    insuranceCompany: string;
    planName: string;
    marketplaceId?: string;
    effectiveDate?: string;
    monthlyPremium?: string;
  };
  createdAt: Date;
}

export function AORTemplate({ data }: { data: AORData }) {
  const currentDate = new Date();
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Autorización de Representación</Text>
          <Text style={styles.subtitle}>Authorization of Representation (AOR)</Text>
          <View style={styles.companyInfo}>
            <Text>MULTISERVICE JAD 5000 C.A.</Text>
            <Text>RIF: J-40411244-8</Text>
            <Text>multiservicejad5000@gmail.com</Text>
            <Text>Tel: 0212-7617671 / 0212-7635224 / 0412-0210824</Text>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.clientInfo}>
          <Text style={[styles.sectionTitle, { borderBottom: 'none', marginBottom: 10 }]}>
            Información del Cliente
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre Completo:</Text>
            <Text style={styles.infoValue}>{data.customer.fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Correo Electrónico:</Text>
            <Text style={styles.infoValue}>{data.customer.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teléfono:</Text>
            <Text style={styles.infoValue}>{data.customer.phone || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dirección:</Text>
            <Text style={styles.infoValue}>{data.customer.address || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SSN:</Text>
            <Text style={styles.infoValue}>
              {data.customer.ssn ? `***-**-${data.customer.ssn.slice(-4)}` : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha de Nacimiento:</Text>
            <Text style={styles.infoValue}>
              {data.customer.birthDate ? formatDate(data.customer.birthDate) : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Policy Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la Póliza</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Aseguradora:</Text>
            <Text style={styles.infoValue}>{data.policy.insuranceCompany}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan:</Text>
            <Text style={styles.infoValue}>{data.policy.planName}</Text>
          </View>
          {data.policy.marketplaceId && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID del Marketplace:</Text>
              <Text style={styles.infoValue}>{data.policy.marketplaceId}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha Efectiva:</Text>
            <Text style={styles.infoValue}>
              {data.policy.effectiveDate ? formatDate(data.policy.effectiveDate) : 'N/A'}
            </Text>
          </View>
          {data.policy.monthlyPremium && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prima Mensual:</Text>
              <Text style={styles.infoValue}>${data.policy.monthlyPremium}</Text>
            </View>
          )}
        </View>

        {/* Authorization Text */}
        <View style={styles.authorizationBox}>
          <Text style={[styles.paragraph, styles.boldText]}>
            AUTORIZACIÓN DE REPRESENTACIÓN
          </Text>
          <Text style={styles.paragraph}>
            Por medio de la presente, yo <Text style={styles.underlineText}>{data.customer.fullName}</Text>, 
            autorizo a <Text style={styles.underlineText}>{data.agent.fullName}</Text> y a 
            <Text style={styles.boldText}> MULTISERVICE JAD 5000 C.A.</Text> para que actúen como mis 
            representantes autorizados ante el Marketplace de Seguros de Salud (Healthcare.gov) y/o 
            cualquier aseguradora mencionada en este documento.
          </Text>
        </View>

        {/* Detailed Authorization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alcance de la Autorización</Text>
          <Text style={styles.paragraph}>
            Esta autorización incluye, pero no se limita a, los siguientes servicios:
          </Text>
          <Text style={styles.paragraph}>
            • Acceder a mi información personal y de salud para completar mi aplicación de seguro médico{'\n'}
            • Enviar y recibir documentos en mi nombre relacionados con mi cobertura de salud{'\n'}
            • Comunicarse con las aseguradoras y el Marketplace en mi representación{'\n'}
            • Proporcionar actualizaciones sobre el estado de mi aplicación y cobertura{'\n'}
            • Asistir con el proceso de inscripción y renovación de mi póliza{'\n'}
            • Ayudar con reclamos y resolución de problemas relacionados con mi cobertura
          </Text>
        </View>

        {/* Privacy and Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad y Términos</Text>
          <Text style={styles.paragraph}>
            Entiendo que toda mi información personal y de salud será manejada de acuerdo con las 
            regulaciones de HIPAA y otras leyes aplicables de privacidad. Esta autorización permanecerá 
            vigente hasta que sea revocada por escrito.
          </Text>
          <Text style={styles.paragraph}>
            Reconozco que he leído y entendido los términos de esta autorización y que la firmo 
            voluntariamente el día <Text style={styles.underlineText}>{formatDate(currentDate)}</Text>.
          </Text>
        </View>

        {/* Agent Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Agente</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre del Agente:</Text>
            <Text style={styles.infoValue}>{data.agent.fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Correo del Agente:</Text>
            <Text style={styles.infoValue}>{data.agent.email || 'N/A'}</Text>
          </View>
          {data.agent.licenseNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Número de Licencia:</Text>
              <Text style={styles.infoValue}>{data.agent.licenseNumber}</Text>
            </View>
          )}
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={[styles.paragraph, styles.boldText]}>
            Firmas Requeridas
          </Text>
          <View style={styles.signatureBox}>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Firma del Cliente</Text>
              <Text style={[styles.signatureLabel, { marginTop: 15 }]}>
                {data.customer.fullName}
              </Text>
            </View>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Firma del Agente</Text>
              <Text style={[styles.signatureLabel, { marginTop: 15 }]}>
                {data.agent.fullName}
              </Text>
            </View>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Fecha</Text>
              <Text style={[styles.signatureLabel, { marginTop: 15 }]}>
                {formatDate(currentDate)}
              </Text>
            </View>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Fecha</Text>
              <Text style={[styles.signatureLabel, { marginTop: 15 }]}>
                {formatDate(currentDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Este documento fue generado automáticamente el {formatDate(currentDate)}.{'\n'}
            Para cualquier consulta, contacte a EV FINANCIAL.
          </Text>
        </View>
      </Page>
    </Document>
  );
}