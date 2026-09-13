import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const AIRPORTS = [
  // India
  { code: 'DEL', name: 'New Delhi', lat: 28.56, lng: 77.10 },
  { code: 'BOM', name: 'Mumbai', lat: 19.09, lng: 72.87 },
  { code: 'BLR', name: 'Bangalore', lat: 13.20, lng: 77.71 },
  { code: 'HYD', name: 'Hyderabad', lat: 17.24, lng: 78.43 },
  { code: 'MAA', name: 'Chennai', lat: 12.99, lng: 80.17 },
  { code: 'CCU', name: 'Kolkata', lat: 22.65, lng: 88.45 },
  { code: 'GOI', name: 'Goa', lat: 15.38, lng: 73.83 },
  { code: 'AMD', name: 'Ahmedabad', lat: 23.07, lng: 72.63 },
  { code: 'COK', name: 'Kochi', lat: 10.15, lng: 76.40 },
  { code: 'JAI', name: 'Jaipur', lat: 26.82, lng: 75.81 },
  { code: 'IXM', name: 'Madurai', lat: 9.83, lng: 78.09 },
  // US
  { code: 'ATL', name: 'Atlanta', lat: 33.64, lng: -84.43 },
  { code: 'ORD', name: 'Chicago', lat: 41.97, lng: -87.90 },
  { code: 'JFK', name: 'New York', lat: 40.64, lng: -73.78 },
  { code: 'LAX', name: 'Los Angeles', lat: 33.94, lng: -118.41 },
  { code: 'DEN', name: 'Denver', lat: 39.86, lng: -104.67 },
  { code: 'SFO', name: 'San Francisco', lat: 37.62, lng: -122.38 },
  { code: 'MIA', name: 'Miami', lat: 25.79, lng: -80.29 },
  { code: 'SEA', name: 'Seattle', lat: 47.45, lng: -122.31 },
  { code: 'DFW', name: 'Dallas', lat: 32.90, lng: -97.04 },
];

function FlightGlobe() {
  const mountRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const sceneData = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = 320, H = 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 5.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Strong key light from upper-right for dramatic 3D shading
    const light1 = new THREE.DirectionalLight(0xffffff, 2.0);
    light1.position.set(5, 3, 5);
    scene.add(light1);

    // Fill light from left (subtle blue) for color depth
    const light2 = new THREE.DirectionalLight(0x4488ff, 0.3);
    light2.position.set(-4, -1, 2);
    scene.add(light2);

    // Very low ambient so dark side stays dark (creates 3D depth)
    scene.add(new THREE.AmbientLight(0x1a2a44, 0.3));

    // Create Earth texture with canvas
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 2048;
    texCanvas.height = 1024;
    const ctx = texCanvas.getContext('2d');

    // Ocean base
    ctx.fillStyle = '#0a4170';
    ctx.fillRect(0, 0, 2048, 1024);

    // Ocean depth variation
    const oceanGrad = ctx.createRadialGradient(1024, 512, 100, 1024, 512, 800);
    oceanGrad.addColorStop(0, 'rgba(20, 100, 160, 0.3)');
    oceanGrad.addColorStop(1, 'rgba(5, 40, 80, 0.3)');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Draw continents using real lat/lng coordinates
    const lngToX = (lng) => ((lng + 180) / 360) * 2048;
    const latToY = (lat) => ((90 - lat) / 180) * 1024;

    const drawLand = (coords, color) => {
      ctx.beginPath();
      ctx.moveTo(lngToX(coords[0][0]), latToY(coords[0][1]));
      for (let i = 1; i < coords.length; i++) {
        ctx.lineTo(lngToX(coords[i][0]), latToY(coords[i][1]));
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 230, 180, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // North America
    drawLand([
      [-168,72],[-145,70],[-130,72],[-120,75],[-100,73],[-85,76],[-65,72],
      [-58,52],[-67,44],[-70,43],[-75,35],[-81,25],[-88,18],[-92,16],
      [-97,16],[-105,20],[-110,23],[-117,32],[-122,37],[-124,40],[-124,48],
      [-130,54],[-135,57],[-140,60],[-150,61],[-157,58],[-166,60],[-168,65]
    ], '#1a7d4d');

    // South America
    drawLand([
      [-80,10],[-75,12],[-65,11],[-55,5],[-50,0],[-45,-3],[-38,-5],[-35,-10],
      [-37,-15],[-40,-22],[-48,-26],[-50,-30],[-53,-33],[-57,-38],[-62,-40],
      [-65,-46],[-67,-50],[-69,-55],[-72,-50],[-74,-42],[-75,-35],[-77,-20],
      [-78,-5],[-77,0],[-75,6],[-78,9]
    ], '#1d8a55');

    // Europe
    drawLand([
      [-10,36],[-9,43],[-5,44],[0,44],[3,43],[5,46],[2,50],[-5,54],[-8,58],
      [-5,59],[0,57],[5,54],[10,55],[12,57],[10,60],[12,63],[15,65],[20,65],
      [25,63],[28,60],[30,58],[28,55],[24,52],[20,50],[16,47],[14,45],
      [15,42],[12,38],[5,37],[0,36],[-5,36]
    ], '#1a7d4d');

    // Africa
    drawLand([
      [-15,35],[-17,15],[-17,10],[-12,5],[-5,5],[5,4],[10,2],[15,3],
      [20,4],[30,2],[32,-5],[35,-8],[40,-11],[37,-18],[35,-25],[30,-30],
      [28,-34],[22,-35],[18,-30],[15,-25],[12,-18],[12,-10],[10,-2],
      [8,5],[3,6],[0,5],[-5,5],[-10,6],[-15,10],[-17,15],[-17,22],
      [-13,28],[-10,32],[-5,35],[0,37],[5,37],[10,37],[15,35],[20,33],
      [25,32],[30,32],[32,30],[35,30],[37,28],[40,25],[42,20],[44,14],
      [50,12],[42,12],[35,15],[30,20],[25,27],[20,31],[15,33],[10,35],[5,36]
    ], '#1d8a55');

    // Asia
    drawLand([
      [30,40],[35,42],[40,43],[45,40],[50,42],[55,45],[60,50],[65,55],
      [70,60],[75,70],[80,72],[90,73],[100,72],[110,70],[120,68],[130,65],
      [135,60],[140,55],[142,50],[145,45],[140,40],[135,35],[130,32],
      [125,30],[120,25],[115,22],[110,15],[108,10],[105,5],[100,2],
      [97,5],[95,10],[90,22],[85,25],[80,28],[75,25],[72,20],[68,24],
      [65,25],[60,25],[55,22],[50,25],[48,28],[45,30],[40,37],[35,38]
    ], '#1b8350');

    // India (highlighted)
    drawLand([
      [68,35],[66,30],[68,25],[70,23],[72,20],[73,17],[75,15],[76,12],
      [77,8],[78,8],[79,10],[80,12],[81,15],[82,17],[84,20],[86,22],
      [88,22],[89,24],[90,26],[89,27],[87,27],[85,26],[83,27],[80,30],
      [78,32],[75,34],[72,35],[70,35]
    ], '#22a85e');

    // Australia
    drawLand([
      [114,-12],[120,-14],[125,-14],[130,-12],[135,-12],[137,-16],
      [140,-18],[143,-15],[145,-17],[149,-20],[152,-24],[154,-28],
      [152,-32],[149,-34],[145,-38],[140,-38],[135,-35],[130,-32],
      [128,-30],[125,-28],[122,-30],[118,-32],[115,-34],[113,-32],
      [114,-28],[116,-22],[115,-18],[113,-15]
    ], '#1d8a55');

    // Greenland
    drawLand([
      [-55,60],[-50,62],[-42,65],[-35,68],[-25,72],[-20,76],[-25,80],
      [-35,82],[-45,82],[-52,80],[-55,76],[-58,72],[-57,65]
    ], '#1a9d5a');

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.needsUpdate = true;

    // Earth sphere with MeshStandardMaterial for better 3D appearance
    const earthGeo = new THREE.SphereGeometry(1.5, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 30,
      specular: new THREE.Color(0x333355),
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.rotation.y = -2.9;
    scene.add(earth);

    // Atmosphere rim - ONLY visible at edges (sharp falloff)
    const atmosGeo = new THREE.SphereGeometry(1.52, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
          float intensity = smoothstep(0.6, 1.0, rim) * 1.8;
          if (intensity < 0.01) discard;
          gl_FragColor = vec4(0.3, 0.7, 1.0, intensity);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Airport markers on surface
    const markerMeshes = [];
    AIRPORTS.forEach((ap) => {
      const phi = (90 - ap.lat) * (Math.PI / 180);
      const theta = (ap.lng + 180) * (Math.PI / 180);
      const r = 1.52;
      const x = -(r * Math.sin(phi) * Math.cos(theta));
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      dot.position.set(x, y, z);
      dot.userData = ap;
      earth.add(dot);
      markerMeshes.push(dot);

      // Pulse ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.05, 0.008, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7 })
      );
      ring.position.set(x, y, z);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      earth.add(ring);
    });

    // Interaction state
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let autoRotate = true;

    const onDown = (e) => {
      isDragging = true;
      autoRotate = false;
      prevX = e.clientX || e.touches?.[0]?.clientX || 0;
      prevY = e.clientY || e.touches?.[0]?.clientY || 0;
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const x = e.clientX || e.touches?.[0]?.clientX || 0;
      const y = e.clientY || e.touches?.[0]?.clientY || 0;
      earth.rotation.y += (x - prevX) * 0.008;
      earth.rotation.x += (y - prevY) * 0.005;
      earth.rotation.x = Math.max(-1, Math.min(1, earth.rotation.x));
      prevX = x;
      prevY = y;
    };

    const onUp = () => {
      isDragging = false;
      setTimeout(() => { autoRotate = true; }, 2000);
    };

    const onClick = (e) => {
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / W) * 2 - 1,
        -((e.clientY - rect.top) / H) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerMeshes);
      if (hits.length > 0) {
        const ap = hits[0].object.userData;
        setTooltip({ code: ap.code, name: ap.name, x: e.clientX - rect.left, y: e.clientY - rect.top });
        setTimeout(() => setTooltip(null), 3000);
      } else {
        setTooltip(null);
      }
    };

    const el = renderer.domElement;
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onUp);
    el.addEventListener('click', onClick);
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onUp);

    // Animate
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && !isDragging) {
        earth.rotation.y += 0.004;
      }
      renderer.render(scene, camera);
    };
    animate();

    sceneData.current = { renderer, animId };

    return () => {
      cancelAnimationFrame(animId);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onUp);
      el.removeEventListener('click', onClick);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onUp);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="globe-container">
      <div ref={mountRef} className="globe-canvas-wrap" />
      {tooltip && (
        <div className="globe-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <strong>{tooltip.code}</strong>
          <span>{tooltip.name}</span>
        </div>
      )}
    </div>
  );
}

export default FlightGlobe;
