#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <model-name-keyword>"
  exit 1
fi

keyword="$1"

echo "== Search in Kie model docs: ${keyword} =="
echo

echo "[1/3] Base API spec"
rg -n -i -- "${keyword}" docs/1-specs/model_apis/kie_api_specs.md || true
echo

echo "[2/3] Image model spec"
rg -n -i -- "${keyword}" docs/1-specs/model_apis/kie-image-api.md || true
echo

echo "[3/3] Video model spec"
rg -n -i -- "${keyword}" docs/1-specs/model_apis/kie-video-api.md || true

echo
echo "Tip: also inspect model config and adapters"
rg -n -i -- "${keyword}" src/configs/models/ai-models.json src/services/generation/providers src/i18n/messages/en.json src/i18n/messages/ja.json || true
