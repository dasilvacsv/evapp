// components/FloatingWhatsAppButton.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image'; // ✅ CAMBIO: Importamos el componente Image de Next.js

// ✅ CAMBIO: Ya no necesitamos el componente SVG, lo hemos eliminado.

export const FloatingWhatsAppButton = () => {
  const phoneNumber = "584142939088"; // Recuerda reemplazar con tu número
  const message = "¡Hola! Quisiera más información sobre las rifas de Llevateloconjorvi.";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Contáctanos por WhatsApp"
      className="group fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-black/40 transition-all duration-300 ease-in-out hover:drop-shadow-[0_0_15px_rgba(37,211,102,0.7)]"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 150, damping: 20, delay: 2 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        width: isHovered ? 'auto' : 64,
        paddingLeft: isHovered ? '1.5rem' : '0rem',
        paddingRight: isHovered ? '2rem' : '0rem',
      }}
    >
      <span className="absolute inset-0 h-full w-full animate-ping rounded-full bg-[#25D366] opacity-30 group-hover:animate-none"></span>
      <span className="relative flex items-center justify-center">
        {/* ✅ CAMBIO: Usamos el componente Image para mostrar tu archivo whatsapp.png */}
        <Image
          src="/whatsapp.png"
          alt="Contactar por WhatsApp"
          width={32} // Tamaño del ícono, equivalente a h-8 y w-8
          height={32}
        />
        
        <AnimatePresence>
          {isHovered && (
            <motion.span
              className="ml-3 origin-left whitespace-nowrap text-base font-bold text-white"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              ¿Necesitas ayuda?
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.a>
  );
};