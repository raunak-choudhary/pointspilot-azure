"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface SceneCard {
  name: string;
  color: string;
  isWinner: boolean;
}

export default function CardScene({ cards }: { cards: SceneCard[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || cards.length === 0) return;

    const W = mount.clientWidth || 800;
    const H = 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // Global fill
    const fill = new THREE.PointLight(0x6c63ff, 1.2, 20);
    fill.position.set(-4, 3, 4);
    scene.add(fill);
    const warmFill = new THREE.PointLight(0xd4af37, 0.6, 15);
    warmFill.position.set(4, -2, 4);
    scene.add(warmFill);

    const cardGeo = new THREE.BoxGeometry(2.4, 1.5, 0.06, 1, 1, 1);
    const meshes: THREE.Mesh[] = [];

    const count = cards.length;
    const spreadX = count === 1 ? 0 : count === 2 ? 1.8 : 2.7;

    cards.forEach((card, i) => {
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(card.color || "#6c63ff"),
        shininess: card.isWinner ? 140 : 60,
        specular: new THREE.Color(card.isWinner ? 0xffffff : 0x666666),
        emissive: new THREE.Color(card.isWinner ? card.color : "#000000"),
        emissiveIntensity: card.isWinner ? 0.15 : 0,
      });

      const mesh = new THREE.Mesh(cardGeo, mat);
      const xPos = count === 1 ? 0 : (i - (count - 1) / 2) * spreadX;
      mesh.position.set(xPos, -5, count === 1 ? 0 : i === 1 ? 0.3 : 0); // start below
      mesh.rotation.x = 0.12;
      mesh.rotation.z = count === 3 ? (i - 1) * 0.04 : 0;
      meshes.push(mesh);
      scene.add(mesh);

      if (card.isWinner) {
        const spot = new THREE.SpotLight(0xffffff, 2.5, 12, Math.PI / 7, 0.4);
        spot.position.set(xPos, 5, 4);
        spot.target = mesh;
        scene.add(spot);
        scene.add(spot.target);

        // Glow ring below winner
        const ringGeo = new THREE.TorusGeometry(1.4, 0.04, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(card.color),
          transparent: true,
          opacity: 0.45,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(xPos, -0.9, 0);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
      }
    });

    let frame = 0;
    const ENTRY_FRAMES = 55;
    let animId = 0;
    const startTime = Date.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      frame = Math.min(frame + 1, ENTRY_FRAMES);
      const t = frame / ENTRY_FRAMES;
      const ease = 1 - Math.pow(1 - t, 3);
      const elapsed = (Date.now() - startTime) * 0.001;

      meshes.forEach((mesh, i) => {
        const count = cards.length;
        const xPos = count === 1 ? 0 : (i - (count - 1) / 2) * spreadX;
        mesh.position.y = -5 + 5 * ease;
        mesh.position.x = xPos;
        mesh.rotation.y = Math.sin(elapsed * 0.6 + i * 1.3) * 0.06;
      });

      renderer.render(scene, camera);
    };
    animate();

    const obs = new ResizeObserver(() => {
      const nw = mount.clientWidth;
      camera.aspect = nw / H;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, H);
    });
    obs.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      obs.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [cards]);

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height: "260px", borderRadius: "12px", overflow: "hidden" }}
    />
  );
}
