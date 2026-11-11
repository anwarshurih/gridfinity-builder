// entry point for the app

const GRID_SIZE = 42;   // mm, standard gridfinity grid
const HEIGHT_UNIT = 7;  // mm per height unit

const form = document.getElementById('controls');
const summary = document.getElementById('summary');

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

// show the real size of the bin in mm under the controls
function updateSummary() {
  const s = getSettings();
  const width = s.unitsX * GRID_SIZE - 0.5;
  const depth = s.unitsY * GRID_SIZE - 0.5;
  const height = s.heightUnits * HEIGHT_UNIT;
  summary.textContent = `Bin size: ${width} x ${depth} x ${height} mm`;
}

// update whenever any setting changes
form.addEventListener('input', updateSummary);

updateSummary();
