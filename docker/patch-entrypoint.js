// Teach upstream's docker-entrypoint.sh to honour the build baked into this
// image, instead of re-running `pnpm run build` on the host.
//
// We patch rather than ship our own copy of the script so that we keep
// inheriting upstream's start-up logic (preflight, migrations, serve command)
// for free. If upstream ever reshapes the script, the anchor below stops
// matching and this exits non-zero — failing the image build loudly instead of
// silently shipping an image that compiles on the server again.
const fs = require("fs");

const ENTRYPOINT = "/app/docker-entrypoint.sh";
const MARKER = "$OUT_DIR/.openseo-prebuilt";

const ANCHOR = `if [ -f "$FP_FILE" ] && [ "$(cat "$FP_FILE")" = "$FINGERPRINT" ]; then`;

const REPLACEMENT = `if [ -f "${MARKER}" ]; then
  echo "Prebuilt image: using the build baked in at image build time (no in-container build)."
elif [ -f "$FP_FILE" ] && [ "$(cat "$FP_FILE")" = "$FINGERPRINT" ]; then`;

const src = fs.readFileSync(ENTRYPOINT, "utf8");

if (!src.includes(ANCHOR)) {
  console.error(
    "FATAL: upstream docker-entrypoint.sh no longer contains the expected " +
      "fingerprint condition. Refusing to build an image that would silently " +
      "fall back to compiling on the server. Re-check the patch script.",
  );
  process.exit(1);
}

fs.writeFileSync(ENTRYPOINT, src.replace(ANCHOR, REPLACEMENT));
console.log("Patched docker-entrypoint.sh to honour the prebuilt marker.");
