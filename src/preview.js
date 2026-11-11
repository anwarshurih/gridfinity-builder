// 3D preview using three.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let binMesh = null;

export function setupPreview(container) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1e1e);

  camera = new THREE.PerspectiveCamera(45, 1, 1, 5000);
  camera.position.set(150, -200, 180);
  camera.up.set(0, 0, 1); // z is up, same as in 3D printing

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // lets you rotate/zoom with the mouse
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(100, -150, 250);
  scene.add(light);

  // grid on the floor, 42mm squares like a gridfinity baseplate
  const grid = new THREE.GridHelper(420, 10, 0x555555, 0x333333);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  // keep the canvas the same size as the preview area
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

// replace the current model with a new one
// positions = flat list of triangle corners (x, y, z, x, y, z, ...)
export function showMesh(positions, height) {
  if (binMesh) {
    scene.remove(binMesh);
    binMesh.geometry.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ color: 0xf0a030, roughness: 0.6 });
  binMesh = new THREE.Mesh(geometry, material);
  scene.add(binMesh);

  controls.target.set(0, 0, height / 2);
}
