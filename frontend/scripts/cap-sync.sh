#!/usr/bin/env bash
# Wrapper de `cap sync` para os apps VAI. SEMPRE usar `npm run cap:sync`,
# nunca `npx cap sync` direto.
#
# Motivo (iOS): Capacitor 8 usa Swift Package Manager e REGENERA
# `ios/App/CapApp-SPM/Package.swift` a cada sync, removendo o pacote
# firebase-ios-sdk (FirebaseMessaging) que o push do iOS precisa. Este
# wrapper re-injeta o Firebase no Package.swift após o sync, se faltar.
set -euo pipefail
cd "$(dirname "$0")/.."

npx cap sync "$@"

PACKAGE_SWIFT="ios/App/CapApp-SPM/Package.swift"
if [ -f "$PACKAGE_SWIFT" ] && ! grep -q "firebase-ios-sdk" "$PACKAGE_SWIFT"; then
  echo "[cap-sync] re-injecting firebase-ios-sdk into $PACKAGE_SWIFT"

  # 1) Adiciona o package Firebase logo após a linha de dependência do CapacitorStatusBar.
  /usr/bin/sed -i '' \
    -e 's|\(\.package(name: "CapacitorStatusBar", path: "../../../node_modules/@capacitor/status-bar")\)|\1,\
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "11.0.0")|' \
    "$PACKAGE_SWIFT"

  # 2) Adiciona o product FirebaseMessaging logo após o product do CapacitorStatusBar.
  /usr/bin/sed -i '' \
    -e 's|\(\.product(name: "CapacitorStatusBar", package: "CapacitorStatusBar")\)|\1,\
                .product(name: "FirebaseMessaging", package: "firebase-ios-sdk")|' \
    "$PACKAGE_SWIFT"

  if grep -q "firebase-ios-sdk" "$PACKAGE_SWIFT"; then
    echo "[cap-sync] firebase-ios-sdk injected OK"
  else
    echo "[cap-sync] WARNING: falha ao injetar firebase-ios-sdk (verifique Package.swift manualmente)" >&2
  fi
fi
