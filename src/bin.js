// builds the gridfinity bin shape using the manifold library
// (manifold does the 3D boolean maths, e.g. cutting the inside out of a block)

const GRID_SIZE = 42;      // mm
const HEIGHT_UNIT = 7;     // mm
const CLEARANCE = 0.5;     // bins are 0.5mm smaller than the grid so they fit
const CORNER_RADIUS = 3.75;
const FLOOR = 1.2;         // thickness of the bottom (mm)

// rounded rectangle, centred on 0,0
function roundedRect(CrossSection, width, depth, radius) {
  const r = Math.min(radius, width / 2 - 0.01, depth / 2 - 0.01);
  const square = CrossSection.square([width - 2 * r, depth - 2 * r], true);
  return square.offset(r, 'Round', 2, 32);
}

// make a basic bin: rounded block with the inside hollowed out
// wasm = the loaded manifold library, s = settings from the form
export function makeBin(wasm, s) {
  const { CrossSection } = wasm;

  const width = s.unitsX * GRID_SIZE - CLEARANCE;
  const depth = s.unitsY * GRID_SIZE - CLEARANCE;
  const height = s.heightUnits * HEIGHT_UNIT;

  // outside of the bin
  const outer = roundedRect(CrossSection, width, depth, CORNER_RADIUS).extrude(height);

  // inside space (made a bit taller so it cuts through the top)
  const innerShape = roundedRect(
    CrossSection,
    width - 2 * s.wall,
    depth - 2 * s.wall,
    CORNER_RADIUS - s.wall
  );
  const inner = innerShape.extrude(height).translate([0, 0, FLOOR]);

  return outer.subtract(inner);
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
