#!/bin/bash
set -e
cd "$(dirname "$0")"
B=../pipeline/node_modules/.bin
rm -rf dist && mkdir -p dist/data
NODE_PATH=../pipeline/node_modules $B/esbuild src/main.js --bundle --format=esm --minify --target=es2020 --charset=ascii --outfile=dist/app.js --log-level=warning
cp index.html dist/index.html
cp -r public/. dist/
cp -r ../pipeline/out2/base ../pipeline/out2/hi ../pipeline/out2/manifest.json dist/data/
cp ../pipeline/refs.json dist/data/refs.json
if [ "$FORMAT" = "b64" ]; then
  for f in $(cd dist/data && find base hi -name '*.mvb'); do base64 -w 0 "dist/data/$f" > "dist/data/${f%.mvb}.b64.txt"; rm "dist/data/$f"; done
  sed -i 's#<script type="module" src="app.js"></script>#<script>window.__VH_DATA_FORMAT__ = "b64";</script><script type="module" src="app.js"></script>#' dist/index.html
  rm -f dist/manifest.webmanifest
  sed -i '/<link rel="manifest"/d' dist/index.html
else
  # content-hashed script name, so a page and its script can never come from different versions
  H=$(sha256sum dist/app.js | cut -c1-10)
  mv dist/app.js "dist/app.$H.js"
  sed -i "s#<script type=\"module\" src=\"app.js\"></script>#<script type=\"module\" src=\"app.$H.js\"></script>#" dist/index.html
  # service worker with a content-hashed version and the precache list
  node -e '
    const fs = require("fs"), path = require("path"), crypto = require("crypto");
    const d = "dist";
    const list = (dir) => fs.readdirSync(path.join(d, dir)).map((f) => dir + "/" + f).sort();
    const shell = ["./", "index.html", ...fs.readdirSync(d).filter((f) => /^app\.[0-9a-f]+\.js$/.test(f)), "manifest.webmanifest", ...list("icons"), "data/manifest.json", "data/refs.json", ...list("data/base")];
    const detail = list("data/hi");
    const h = crypto.createHash("sha256");
    for (const f of [...shell.slice(1), ...detail]) h.update(fs.readFileSync(path.join(d, f)));
    const version = h.digest("hex").slice(0, 12);
    let sw = fs.readFileSync("sw.template.js", "utf8");
    sw = sw.replace("__VERSION__", version).replace("__PRECACHE__", JSON.stringify(shell)).replace("__DETAIL_FILES__", JSON.stringify(detail));
    fs.writeFileSync(path.join(d, "sw.js"), sw);
    console.log("sw version", version, "precache", shell.length, "files");
  '
fi
du -sh dist
