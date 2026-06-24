'use client';
import { useEffect, useRef } from 'react';
import { drawPost, type PostSpec } from './postRender';

// Renders a branded post to a canvas, scaled to fit its container width.
export default function PostCanvas({ spec, maxWidth = 360 }: { spec: PostSpec; maxWidth?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    if (ref.current) drawPost(ref.current, spec).then(() => { if (cancelled && ref.current) { /* noop */ } });
    return () => { cancelled = true; };
  }, [spec.format, spec.template, spec.accent, spec.headline, spec.subtext, spec.cta]);
  const ratio = spec.format === 'story' ? 16 / 9 : spec.format === 'landscape' ? 675 / 1200 : 1;
  return (
    <canvas
      ref={ref}
      style={{
        width: '100%', maxWidth, height: 'auto', display: 'block',
        borderRadius: 12, border: '1px solid var(--border)', aspectRatio: `1 / ${ratio}`,
      }}
    />
  );
}
