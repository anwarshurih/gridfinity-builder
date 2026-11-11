# Gridfinity Bin Builder

A web app for designing custom [Gridfinity](https://gridfinity.xyz/) storage bins. Pick the size, height and layout you want, preview it in 3D, then download an STL ready to 3D print.

No install needed, it all runs in the browser.

## Status

Work in progress. See [TODO.md](TODO.md) for what's planned.

## Running locally

Because it uses JavaScript modules you need a local server, e.g.:

```
python -m http.server
```

then open http://localhost:8000

## Built with

- HTML, CSS, JavaScript
- [Three.js](https://threejs.org/) for the 3D preview (coming soon)
- [Manifold](https://github.com/elalish/manifold) for generating the bin geometry (coming soon)
