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

// read a number input and keep it between its min and max
// (stops things like a 0 or 500 unit bin breaking the preview)
function readNumber(id) {
  const input = document.getElementById(id);
  const min = Number(input.min);
  const max = Number(input.max);
  let value = Number(input.value);

  if (Number.isNaN(value) || input.value === '') value = Number(input.defaultValue);
  if (input.step !== 'any' && !input.step) value = Math.round(value); // whole numbers only
  return Math.min(max, Math.max(min, value));
}

// read all the settings from the form into one object
function getSettings() {
  return {
    unitsX: readNumber('unitsX'),
    unitsY: readNumber('unitsY'),
    heightUnits: readNumber('heightUnits'),
    wall: readNumber('wall'),
    compartmentsX: readNumber('compartmentsX'),
    compartmentsY: readNumber('compartmentsY'),
    stackingLip: document.getElementById('stackingLip').checked,
    magnets: document.getElementById('magnets').checked,
  };
}

// name the file after the settings so it's easy to find later
function makeFilename(s) {
  let name = `gridfinity_${s.unitsX}x${s.unitsY}x${s.heightUnits}`;
  if (s.compartmentsX * s.compartmentsY > 1) name += `_${s.compartmentsX}x${s.compartmentsY}-compartments`;
  if (s.magnets) name += '_magnets';
  if (!s.stackingLip) name += '_nolip';
  return name + '.stl';
}

// work out the bin size, show it under the controls and update the preview
function update() {
  const s = getSettings();
  const width = s.unitsX * GRID_SIZE - 0.5;
  const depth = s.unitsY * GRID_SIZE - 0.5;
  const height = s.heightUnits * HEIGHT_UNIT + (s.stackingLip ? 4.4 : 0);

  summary.textContent = `Bin size: ${width} x ${depth} x ${height.toFixed(1)} mm`;

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
  const filename = makeFilename(s);
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
