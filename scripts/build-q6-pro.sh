#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
QMK_HOME=${QMK_HOME:-$(qmk config user.qmk_home 2>/dev/null | sed 's/^user.qmk_home=//')}
TARGET="$QMK_HOME/keyboards/keychron/q6_pro"
EXPECTED_QMK_COMMIT=618127a725a1773e85f13455602cf6f72ab4de17

if [ ! -d "$TARGET" ]; then
  echo "Keychron q6_pro source not found under QMK_HOME=$QMK_HOME" >&2
  exit 1
fi

grep -q '"processor": "STM32L432"' "$TARGET/info.json" &&
grep -q '"bootloader": "stm32-dfu"' "$TARGET/info.json" &&
grep -q '"vid": "0x3434"' "$TARGET/info.json" &&
grep -q '"pid": "0x0660"' "$TARGET/ansi_encoder/info.json" || {
  echo "Refusing unexpected keyboard target metadata; expected Q6 Pro ANSI Knob 3434:0660 with STM32L432/stm32-dfu." >&2
  exit 1
}

ACTUAL_QMK_COMMIT=$(git -C "$QMK_HOME" rev-parse HEAD)
if [ "$ACTUAL_QMK_COMMIT" != "$EXPECTED_QMK_COMMIT" ] && [ "${AGENTGLOW_ALLOW_UNTESTED_QMK:-0}" != "1" ]; then
  echo "Refusing untested Keychron source commit: $ACTUAL_QMK_COMMIT" >&2
  echo "Expected: $EXPECTED_QMK_COMMIT" >&2
  echo "Set AGENTGLOW_ALLOW_UNTESTED_QMK=1 only after reviewing and testing the new source." >&2
  exit 1
fi

for file in q6_pro.c rules.mk; do
  git -C "$QMK_HOME" diff --quiet -- "keyboards/keychron/q6_pro/$file" || {
    echo "Refusing to alter dirty QMK file: $file" >&2; exit 1;
  }
done

cleanup() {
  git -C "$QMK_HOME" checkout -- keyboards/keychron/q6_pro/q6_pro.c keyboards/keychron/q6_pro/rules.mk
  rm -f "$TARGET/agentglow.c" "$TARGET/agentglow.h" "$TARGET/rgb_matrix_kb.inc"
}
trap cleanup EXIT INT TERM

cp "$ROOT/firmware/qmk/agentglow.c" "$TARGET/agentglow.c"
cp "$ROOT/firmware/qmk/agentglow.h" "$TARGET/agentglow.h"
cp "$ROOT/firmware/qmk/rgb_matrix_kb.inc" "$TARGET/rgb_matrix_kb.inc"
git -C "$QMK_HOME" apply "$ROOT/firmware/keychron-q6-pro.patch"

PATH="/opt/homebrew/opt/arm-none-eabi-gcc@8/bin:/opt/homebrew/opt/arm-none-eabi-binutils/bin:$PATH" \
  qmk compile -kb keychron/q6_pro/ansi_encoder -km via
mkdir -p "$ROOT/build"
cp "$QMK_HOME/keychron_q6_pro_ansi_encoder_via.bin" "$ROOT/build/agentglow-q6-pro-ansi-v0.1.0.bin"
if command -v dfu-suffix >/dev/null 2>&1; then
  dfu-suffix -c "$ROOT/build/agentglow-q6-pro-ansi-v0.1.0.bin"
else
  echo "Warning: dfu-suffix is unavailable; the compiler succeeded but the DFU suffix was not independently checked." >&2
fi
echo "Built: $ROOT/build/agentglow-q6-pro-ansi-v0.1.0.bin"
