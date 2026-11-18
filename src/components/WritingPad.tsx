import { useEffect, useRef, useState, type PointerEvent } from "react";
import { RotateCcw } from "lucide-react";

interface WritingPadProps {
  guideChar: string;
}

export function WritingPad({ guideChar }: WritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  useEffect(() => {
    clearCanvas();
  }, [guideChar]);

  const getPoint = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#0F172A";
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">
          Vẽ đè lên chữ mẫu để ghi nhớ nét
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={!hasInk}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed rounded border border-slate-200 bg-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Xóa nét
        </button>
      </div>

      <div className="relative w-full aspect-square max-w-[220px] mx-auto bg-slate-50 border border-slate-200 rounded-lg overflow-hidden select-none touch-none">
        {/* Crosshair guides */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="w-full border-t border-dashed border-slate-300/80" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-full border-l border-dashed border-slate-300/80" />
        </div>
        {/* Ghost trace character */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-jp text-[116px] leading-none text-slate-200"
        >
          {guideChar}
        </div>
        <canvas
          ref={canvasRef}
          width={240}
          height={240}
          aria-label={`Bảng luyện viết chữ ${guideChar}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative z-10 w-full h-full cursor-crosshair"
        />
      </div>
    </div>
  );
}
