// export a manifold as a binary STL file
// binary STL layout: 80 byte header, 4 byte triangle count,
// then 50 bytes per triangle (normal + 3 corners as floats, plus 2 spare bytes)

export function makeSTL(bin) {
  const mesh = bin.getMesh();
  const triCount = mesh.triVerts.length / 3;

  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);

  view.setUint32(80, triCount, true); // header left as zeros

  // get corner i of the mesh as [x, y, z]
  function point(i) {
    const p = i * mesh.numProp;
    return [mesh.vertProperties[p], mesh.vertProperties[p + 1], mesh.vertProperties[p + 2]];
  }

  let offset = 84;
  for (let t = 0; t < triCount; t++) {
    const a = point(mesh.triVerts[t * 3]);
    const b = point(mesh.triVerts[t * 3 + 1]);
    const c = point(mesh.triVerts[t * 3 + 2]);

    // normal = cross product of two edges, then make it length 1
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    n = [n[0] / len, n[1] / len, n[2] / len];

    for (const value of [...n, ...a, ...b, ...c]) {
      view.setFloat32(offset, value, true);
      offset += 4;
    }
    offset += 2; // spare bytes
  }

  return buffer;
}

// make the browser download the file
export function downloadFile(data, filename) {
  const blob = new Blob([data], { type: 'model/stl' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
