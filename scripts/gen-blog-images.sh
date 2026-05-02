#!/usr/bin/env bash
# Generates hero images for each blog post via Google Imagen 3 API.
# Run from: Sites/PQ\ site/
# Requires: GEMINI_API_KEY in env, jq, base64.
# Output: blog/images/posts/{slug}.png

set -eo pipefail

API_KEY="${GEMINI_API_KEY:-}"
[ -z "$API_KEY" ] && { echo "GEMINI_API_KEY not set"; exit 1; }

OUT_DIR="blog/images/posts"
mkdir -p "$OUT_DIR"

ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=$API_KEY"

generate() {
  local slug="$1"
  local prompt="$2"
  local out="$OUT_DIR/$slug.png"
  if [ -f "$out" ]; then
    echo "Skip (exists): $out"
    return
  fi
  echo "Generating: $slug"
  local body
  body=$(jq -n --arg p "$prompt" '{instances: [{prompt: $p}], parameters: {sampleCount: 1, aspectRatio: "16:9", safetyFilterLevel: "block_only_high"}}')
  local resp
  resp=$(curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" -d "$body")
  local b64
  b64=$(echo "$resp" | jq -r '.predictions[0].bytesBase64Encoded // empty')
  if [ -z "$b64" ]; then
    echo "FAILED: $slug"
    echo "$resp" | head -c 500
    echo
    return
  fi
  echo "$b64" | base64 -d > "$out"
  echo "Saved: $out ($(stat -f%z "$out") bytes)"
}

generate "introducing-protoquiz" "A paramedic looking at a phone screen reviewing EMS protocol study material, dark mode interface visible, clean editorial photography, blue and indigo accent lighting, 16:9 cinematic, no text overlay"
generate "first-month" "An ambulance station with golden hour light filtering through the bay door, a paramedic studying on a tablet, photo-realistic editorial, contemplative mood, 16:9, no text overlay"
generate "protoquiz-2-upgrades" "An abstract data visualization with rising performance graphs, indigo and emerald glow, professional dark UI aesthetic on a glass surface, 16:9 wide shot, no text"
generate "ems-training-compliance" "A clipboard with stethoscope on a desk in a fire-EMS administrative office, soft warm overhead light, training records folders nearby, professional editorial photography, no text visible, 16:9"
generate "ems-pharmacology" "A medication kit open on a stretcher in an ambulance, vials and syringes neatly arranged, clinical lighting, shallow depth of field, professional medical photography, no text, 16:9"
generate "spaced-repetition" "An hourglass beside a stack of medical reference books with a phone showing flashcards, warm desk lamp light, focused study aesthetic, 16:9, no text"
generate "how-to-study-protocols" "A paramedic in uniform reading a protocol binder at a fire station kitchen table, focused expression, natural window light, candid editorial photography, 16:9, no text"
generate "why-protoquiz-free" "An open hand offering an open book, abstract symbolic photography, soft blue and emerald gradient background, clean and welcoming, 16:9, no text"

echo "Done. Images in $OUT_DIR/"
