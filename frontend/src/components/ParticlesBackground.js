import { useEffect, useMemo, useState } from 'react';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { tsParticles } from '@tsparticles/engine';

function ParticlesBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSlim(tsParticles).then(() => setReady(true)).catch(() => {});
  }, []);

  const options = useMemo(() => ({
    fullScreen: { enable: false },
    background: { color: { value: 'transparent' } },
    fpsLimit: 60,
    interactivity: {
      events: {
        onHover: { enable: true, mode: 'grab' },
        onClick: { enable: true, mode: 'push' },
      },
      modes: {
        grab: { distance: 140, links: { opacity: 0.5 } },
        push: { quantity: 3 },
      },
    },
    particles: {
      color: { value: ['#0ea5e9', '#38bdf8', '#0284c7', '#7dd3fc'] },
      links: {
        color: '#0ea5e9',
        distance: 150,
        enable: true,
        opacity: 0.12,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.6,
        direction: 'none',
        random: true,
        straight: false,
        outModes: { default: 'bounce' },
      },
      number: {
        density: { enable: true, area: 1200 },
        value: 25,
      },
      opacity: {
        value: { min: 0.1, max: 0.35 },
      },
      shape: { type: 'circle' },
      size: {
        value: { min: 1, max: 3 },
      },
    },
    detectRetina: true,
  }), []);

  if (!ready) return null;

  return (
    <Particles
      id="tsparticles"
      options={options}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

export default ParticlesBackground;
