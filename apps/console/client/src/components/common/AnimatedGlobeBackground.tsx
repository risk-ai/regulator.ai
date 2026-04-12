/**
 * Animated Globe Background — Vienna OS
 * 
 * Spinning globe with animated ping connections.
 * Used across premium console pages for "global governance" atmosphere.
 */

import { useEffect, useRef, useState } from 'react';

export function AnimatedGlobeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connections, setConnections] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; progress: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.25;
    let rotation = 0;

    const generateSpherePoint = () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return { theta, phi };
    };

    const project = (theta: number, phi: number, rot: number) => {
      const x3d = radius * Math.sin(phi) * Math.cos(theta + rot);
      const y3d = radius * Math.sin(phi) * Math.sin(theta + rot);
      const z3d = radius * Math.cos(phi);
      return {
        x: centerX + x3d,
        y: centerY + y3d,
        z: z3d,
        visible: z3d > -radius * 0.3,
      };
    };

    const updateConnections = () => {
      setConnections(prev => {
        const newConns = prev.map(c => ({ ...c, progress: c.progress + 0.01 })).filter(c => c.progress < 1);
        if (Math.random() < 0.03 && newConns.length < 10) {
          const p1 = generateSpherePoint();
          const p2 = generateSpherePoint();
          const proj1 = project(p1.theta, p1.phi, rotation);
          const proj2 = project(p2.theta, p2.phi, rotation);
          if (proj1.visible && proj2.visible) {
            newConns.push({ x1: proj1.x, y1: proj1.y, x2: proj2.x, y2: proj2.y, progress: 0 });
          }
        }
        return newConns;
      });
    };

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw globe outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw latitude/longitude grid
      for (let i = 0; i < 8; i++) {
        const lat = (i / 8) * Math.PI;
        ctx.beginPath();
        for (let j = 0; j <= 64; j++) {
          const lon = (j / 64) * Math.PI * 2;
          const proj = project(lon, lat, rotation);
          if (proj.visible) {
            if (j === 0) ctx.moveTo(proj.x, proj.y);
            else ctx.lineTo(proj.x, proj.y);
          }
        }
        ctx.stroke();
      }

      for (let i = 0; i < 12; i++) {
        const lon = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        for (let j = 0; j <= 64; j++) {
          const lat = (j / 64) * Math.PI;
          const proj = project(lon, lat, rotation);
          if (proj.visible) {
            if (j === 0) ctx.moveTo(proj.x, proj.y);
            else ctx.lineTo(proj.x, proj.y);
          }
        }
        ctx.stroke();
      }

      // Draw connections
      connections.forEach(conn => {
        const x = conn.x1 + (conn.x2 - conn.x1) * conn.progress;
        const y = conn.y1 + (conn.y2 - conn.y1) * conn.progress;
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 * (1 - conn.progress)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(conn.x1, conn.y1);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = `rgba(251, 191, 36, ${0.7 * (1 - conn.progress)})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      rotation += 0.001;
      updateConnections();
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [connections]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.12 }}
    />
  );
}
