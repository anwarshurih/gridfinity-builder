// builds the gridfinity bin shape using the manifold library
// (manifold does the 3D boolean maths, e.g. cutting the inside out of a block)

const GRID_SIZE = 42;      // mm
const HEIGHT_UNIT = 7;     // mm
const CLEARANCE = 0.5;     // bins are 0.5mm smaller than the grid so they fit
const CORNER_RADIUS = 3.75;
const BASE_HEIGHT = 4.75;  // height of the feet that sit in the baseplate
const FLOOR = 1.2;         // thickness of the bottom above the feet (mm)
const LIP_HEIGHT = 4.4;    // stacking lip sticks up this much above the bin

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

// thin rounded slice with separate width/depth, shrunk in by "inset" from the bin outline
function insetSlice(CrossSection, width, depth, inset, z) {
  const r = Math.max(0.5, CORNER_RADIUS - inset);
  return roundedRect(CrossSection, width - 2 * inset, depth - 2 * inset, r)
    .extrude(0.01)
    .translate([0, 0, z]);
}

// the space inside a bin with a stacking lip
// the lip copies the shape of the base (upside down) so another bin can sit on top
function lipCavity(wasm, width, depth, wall, height, floorZ) {
  const { Manifold, CrossSection } = wasm;
  const at = (inset, z) => insetSlice(CrossSection, width, depth, inset, z);

  const narrowest = 2.6; // how far the lip sticks in at its narrowest point
  const ledge = height - Math.max(0, narrowest - wall); // where the walls start sloping in

  const parts = [
    // straight inside walls up to the ledge
    roundedRect(CrossSection, width - 2 * wall, depth - 2 * wall, Math.max(0.5, CORNER_RADIUS - wall))
      .extrude(ledge - floorZ)
      .translate([0, 0, floorZ]),
    Manifold.hull([at(wall, ledge), at(narrowest, height)]),            // 45 degree ledge (printable without supports)
    Manifold.hull([at(narrowest, height), at(1.9, height + 0.7)]),      // 0.7mm slope
    Manifold.hull([at(1.9, height + 0.7), at(1.9, height + 2.5)]),      // 1.8mm straight
    Manifold.hull([at(1.9, height + 2.5), at(0.6, height + 3.8)]),      // slope out to the top
    Manifold.hull([at(0.6, height + 3.8), at(0.6, height + LIP_HEIGHT + 1)]), // through the top
  ];
  return Manifold.union(parts);
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

  // main body sits on top of the feet (taller if it has a stacking lip)
  const topZ = s.stackingLip ? height + LIP_HEIGHT : height;
  const body = roundedRect(CrossSection, width, depth, CORNER_RADIUS)
    .extrude(topZ - BASE_HEIGHT)
    .translate([0, 0, BASE_HEIGHT]);

  const floorZ = BASE_HEIGHT + FLOOR;
  let inner;
  if (s.stackingLip) {
    inner = lipCavity(wasm, width, depth, s.wall, height, floorZ);
  } else {
    // plain inside space (made a bit taller so it cuts through the top)
    inner = roundedRect(CrossSection, width - 2 * s.wall, depth - 2 * s.wall, CORNER_RADIUS - s.wall)
      .extrude(height)
      .translate([0, 0, floorZ]);
  }

  let bin = Manifold.union([...feet, body]).subtract(inner);

  // magnet holes in the bottom of each foot
  if (s.magnets) {
    bin = bin.subtract(makeMagnetHoles(wasm, s));
  }

  // dividers between compartments
  const dividers = makeDividers(wasm, s, width, depth, floorZ, height);
  if (dividers.length > 0) {
    bin = Manifold.union([bin, ...dividers]);
  }
  return bin;
}

// standard gridfinity magnet holes: 6.5mm wide, 2.4mm deep,
// 4 per grid square, each 13mm from the centre in x and y (26mm apart)
function makeMagnetHoles(wasm, s) {
  const { Manifold } = wasm;
  const hole = Manifold.cylinder(2.4, 3.25, 3.25, 32);
  const holes = [];

  for (let x = 0; x < s.unitsX; x++) {
    for (let y = 0; y < s.unitsY; y++) {
      const cx = (x - (s.unitsX - 1) / 2) * GRID_SIZE;
      const cy = (y - (s.unitsY - 1) / 2) * GRID_SIZE;
      for (const [dx, dy] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) {
        holes.push(hole.translate([cx + dx, cy + dy, -0.01]));
      }
    }
  }
  return Manifold.union(holes);
}

// thin walls splitting the inside into compartments
function makeDividers(wasm, s, width, depth, floorZ, height) {
  const { Manifold } = wasm;
  const thickness = Math.max(0.8, s.wall);
  const innerW = width - 2 * s.wall;
  const innerD = depth - 2 * s.wall;
  // stop just below the top (or below the lip) so bins still stack
  const top = s.stackingLip ? height - 1.5 : height - 0.5;
  const tall = top - floorZ + 0.1;
  const dividers = [];

  for (let i = 1; i < s.compartmentsX; i++) {
    const x = -innerW / 2 + (innerW * i) / s.compartmentsX;
    const wall = Manifold.cube([thickness, innerD + 0.2, tall], true);
    dividers.push(wall.translate([x, 0, floorZ - 0.1 + tall / 2]));
  }
  for (let j = 1; j < s.compartmentsY; j++) {
    const y = -innerD / 2 + (innerD * j) / s.compartmentsY;
    const wall = Manifold.cube([innerW + 0.2, thickness, tall], true);
    dividers.push(wall.translate([0, y, floorZ - 0.1 + tall / 2]));
  }
  return dividers;
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
