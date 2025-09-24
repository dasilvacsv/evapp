// components/signature-pad.tsx

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2, PenSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Props del componente ---
interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void;
  className?: string;
  backgroundColor?: string;
  penColor?: string;
}

// --- Placeholder para el estado inicial ---
const SignaturePlaceholder = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
    <PenSquare className="h-12 w-12 mb-2" />
    <span className="font-medium">Firme en este recuadro</span>
  </div>
);

// --- Componente principal ---
export default function SignaturePad({
  onSignatureChange,
  className,
  backgroundColor = '#ffffff',
  penColor = '#000000',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  // Historial para la función de deshacer
  const [history, setHistory] = useState<ImageData[]>([]);

  const getContext = useCallback(() => canvasRef.current?.getContext('2d'), []);

  // Función para inicializar o limpiar el canvas
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    // Limpiar cualquier contenido previo
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Establecer el fondo
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Configurar el lápiz
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5; // Un poco más grueso para mejor visibilidad
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [backgroundColor, penColor, getContext]);

  // Redimensionar el canvas para que sea responsivo
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const { width, height } = container.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    
    // Al redimensionar, reiniciamos el canvas para evitar distorsiones
    initializeCanvas();
    setIsEmpty(true);
    setHistory([]);
    onSignatureChange(null);
  }, [initializeCanvas, onSignatureChange]);

  // Efecto para redimensionar al montar y observar cambios
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  const getEventPosition = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const touch = 'touches' in event ? event.touches[0] : null;
    const clientX = touch ? touch.clientX : (event as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (event as React.MouseEvent).clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;

    // Guardar el estado actual para la función de deshacer
    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory((prev) => [...prev, imageData]);

    const pos = getEventPosition(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }, [getContext]);

  const draw = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    const ctx = getContext();
    if (!ctx) return;
    
    const pos = getEventPosition(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    if (isEmpty) setIsEmpty(false);
  }, [isDrawing, isEmpty, getContext]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas && !isEmpty) {
      onSignatureChange(canvas.toDataURL('image/png'));
    }
  }, [isDrawing, isEmpty, onSignatureChange]);

  const clearSignature = useCallback(() => {
    initializeCanvas();
    setIsEmpty(true);
    setHistory([]);
    onSignatureChange(null);
  }, [initializeCanvas, onSignatureChange]);

  const handleUndo = useCallback(() => {
    const ctx = getContext();
    if (!ctx || history.length === 0) return;

    const lastState = history[history.length - 1];
    ctx.putImageData(lastState, 0, 0);

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    // Si el historial queda vacío, el canvas está limpio
    if (newHistory.length === 0) {
      setIsEmpty(true);
      onSignatureChange(null);
    } else {
        // Actualizar la firma con el estado previo
        const canvas = canvasRef.current;
        if(canvas) onSignatureChange(canvas.toDataURL('image/png'));
    }
  }, [getContext, history, onSignatureChange]);

  return (
    <div className={cn('w-full flex flex-col space-y-2', className)}>
      <div
        className={cn(
          'relative w-full h-52 rounded-lg border-2 border-dashed transition-colors duration-200',
          'touch-none', // Previene el scroll en móviles mientras se dibuja
          isDrawing ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-gray-300',
          !isEmpty && 'border-solid border-primary'
        )}
      >
        {/* Placeholder que se muestra cuando el canvas está vacío */}
        {isEmpty && <SignaturePlaceholder />}
        
        {/* Botones de acción que aparecen sobre el canvas */}
        {!isEmpty && (
          <div className="absolute top-2 right-2 z-10 flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleUndo}
              disabled={history.length === 0}
              aria-label="Deshacer último trazo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={clearSignature}
              aria-label="Limpiar firma"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-md cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
  onTouchEnd={stopDrawing}
          role="img"
          aria-label="Área para firmar"
        />
      </div>
    </div>
  );
}