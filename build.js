// build.js
const esbuild = require("esbuild");
const path = require("path");

const inputFile = path.resolve(__dirname, "node_modules/@erc7824/nitrolite/dist/index.js");
const outFile = path.resolve(__dirname, "Runtime/WebGL/nitrolite.bundle.js");

esbuild.build({
  entryPoints: [inputFile],
  bundle: true,
  minify: true,
  globalName: "NitroLite",       // exposes NitroLite globally
  outfile: outFile,
  platform: "browser",
})
.then(() => {
  console.log("Nitrolite bundle created at", outFile);
})
.catch(err => {
  console.error("Error bundling NitroLite:", err);
  process.exit(1);
});
