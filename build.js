// build.js
const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const inputFile = path.resolve(__dirname, "node_modules/@erc7824/nitrolite/dist/index.js");
const outFile = path.resolve(__dirname, "Runtime/webgl/nitrolite.bundle.js");
const buildOutFile = path.resolve(__dirname, "../../../Build/nitrolite.bundle.js");

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
  
  // Copy to Build folder if it exists
  if (fs.existsSync(path.dirname(buildOutFile))) {
    fs.copyFileSync(outFile, buildOutFile);
    console.log("Copied bundle to Build folder");
  }
})
.catch(err => {
  console.error("Error bundling NitroLite:", err);
  process.exit(1);
});
