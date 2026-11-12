// entry point for the app

import Module from 'https://cdn.jsdelivr.net/npm/manifold-3d@3.5.4/manifold.js';
import { setupPreview, showMesh } from './preview.js';
import { makeBin, getMeshData } from './bin.js';
import { makeSTL, downloadFile } from './stl.js';

const GRID_SIZE = 42;   // mm, standard gridfinity grid
const HEIGHT_UNIT = 7;  // mm per height unit

const form = document.getElementById('controls');
const summary = document.getElementById('summary');
const downloadBtn = document.getElementById('downloadBtn');

let wasm = null; // the manifold library, loaded at startup

// read all the settings from the form into one object
function getSettings() {
  return {
    unitsX: Number(document.getElementById('unitsX').value),
    unitsY: Number(document.getElementById('unitsY').value),
    heightUnits: Number(document.getElementById('heightUnits').value),
    wall: Number(document.getElementById('wall').value),
    compartmentsX: Number(document.getElementById('compartmentsX').value),
    compartmentsY: Number(document.getElementById('compartmentsY').value),
    stackingLip: document.getElementById('stackingLip').checked,
    magnets: document.getElementById('magnets').checked,
  };
}

// work out the bin size, show it under the controls and update the preview
function update() {
  const s = getSettings();
  const width = s.unitsX * GRID_SIZE - 0.5;
  const depth = s.unitsY * GRID_SIZE - 0.5;
  const height = s.heightUnits * HEIGHT_UNIT;

  summary.textContent = `Bin size: ${width} x ${depth} x ${height} mm`;

  if (!wasm) return; // library not loaded yet

  const bin = makeBin(wasm, s);
  showMesh(getMeshData(bin), height);
  bin.delete(); // free the memory used by manifold
}

setupPreview(document.getElementById('preview'));
form.addEventListener('input', update);
update();

// build the bin again and save it as an STL
downloadBtn.addEventListener('click', () => {
  const s = getSettings();
  const bin = makeBin(wasm, s);
  const filename = `gridfinity_${s.unitsX}x${s.unitsY}x${s.heightUnits}.stl`;
  downloadFile(makeSTL(bin), filename);
  bin.delete();
});

// load manifold (it's a WebAssembly library so it takes a moment)
Module().then((loaded) => {
  wasm = loaded;
  wasm.setup();
  downloadBtn.disabled = false;
  update();
});
