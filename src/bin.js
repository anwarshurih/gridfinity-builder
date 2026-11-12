// builds the gridfinity bin shape using the manifold library
// (manifold does the 3D boolean maths, e.g. cutting the inside out of a block)

const GRID_SIZE = 42;      // mm
const HEIGHT_UNIT = 7;     // mm
const CLEARANCE = 0.5;     // bins are 0.5mm smaller than the grid so they fit
const CORNER_RADIUS = 3.75;
const BASE_HEIGHT = 4.75;  // height of the feet that sit in the baseplate
const FLOOR = 1.2;         // thickness of the bottom above the feet (mm)

// rounded rectangle, centred on 0,0
function roundedRect(CrossSection, width, depth, radius) {
  const r = Math.min(radius, width / 2 - 0.01, depth / 2 - 0.01);
  const square = CrossSection.square([width - 2 * r, depth - 2 * r], true);
  return square.offset(r, 'Round', 2, 32);
}

// a very thin rounded slice at height z (used to build sloped shapes)
function slice(CrossSection, size, radius, z) {
  return roundedRect(CrossSection, size, size, radius).extrude(0.01).translate([0, 0, z]);
}

// one gridfinity foot (the stepped shape under each grid square)
// profile from the bottom: 0.8mm at 45 degrees, 1.8mm straight up, 2.15mm at 45 degrees
function makeFoot(wasm) {
  const { Manifold, CrossSection } = wasm;
  const top = GRID_SIZE - CLEARANCE; // 41.5mm

  const s0 = slice(CrossSection, top - 5.9, 0.8, 0);
  const s1 = slice(CrossSection, top - 4.3, 1.6, 0.8);
  const s2 = slice(CrossSection, top - 4.3, 1.6, 2.6);
  const s3 = slice(CrossSection, top, CORNER_RADIUS, BASE_HEIGHT);

  // hull = shrink-wrap around the slices, which gives the sloped sides
  return Manifold.union([
    Manifold.hull([s0, s1]),
    Manifold.hull([s1, s2]),
    Manifold.hull([s2, s3]),
  ]);
}

// make the bin: feet + rounded body with the inside hollowed out
// wasm = the loaded manifold library, s = settings from the form
export function makeBin(wasm, s) {
  const { Manifold, CrossSection } = wasm;

  const width = s.unitsX * GRID_SIZE - CLEARANCE;
  const depth = s.unitsY * GRID_SIZE - CLEARANCE;
  const height = s.heightUnits * HEIGHT_UNIT;

  // one foot for every grid square
  const foot = makeFoot(wasm);
  const feet = [];
  for (let x = 0; x < s.unitsX; x++) {
    for (let y = 0; y < s.unitsY; y++) {
      // centre of this grid square
      const cx = (x - (s.unitsX - 1) / 2) * GRID_SIZE;
      const cy = (y - (s.unitsY - 1) / 2) * GRID_SIZE;
      feet.push(foot.translate([cx, cy, 0]));
    }
  }

  // main body sits on top of the feet
  const body = roundedRect(CrossSection, width, depth, CORNER_RADIUS)
    .extrude(height - BASE_HEIGHT)
    .translate([0, 0, BASE_HEIGHT]);

  // inside space (made a bit taller so it cuts through the top)
  const inner = roundedRect(CrossSection, width - 2 * s.wall, depth - 2 * s.wall, CORNER_RADIUS - s.wall)
    .extrude(height)
    .translate([0, 0, BASE_HEIGHT + FLOOR]);

  return Manifold.union([...feet, body]).subtract(inner);
}

// turn a manifold into flat arrays three.js can use
export function getMeshData(bin) {
  const mesh = bin.getMesh();
  const positions = new Float32Array(mesh.triVerts.length * 3);

  for (let i = 0; i < mesh.triVerts.length; i++) {
    const v = mesh.triVerts[i];
    positions[i * 3] = mesh.vertProperties[v * mesh.numProp];
    positions[i * 3 + 1] = mesh.vertProperties[v * mesh.numProp + 1];
    positions[i * 3 + 2] = mesh.vertProperties[v * mesh.numProp + 2];
  }
  return positions;
}
