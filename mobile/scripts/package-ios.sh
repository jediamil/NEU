#!/usr/bin/env bash
set -euo pipefail

mkdir -p artifacts
workspace="$(find ios -maxdepth 1 -name '*.xcworkspace' -print -quit)"
if [ -z "$workspace" ]; then
  echo "The generated iOS workspace was not found."
  exit 1
fi

export RCT_NO_LAUNCH_PACKAGER=1
if ! xcodebuild \
  -workspace "$workspace" \
  -scheme NEUHealth \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ios/build \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  build > artifacts/xcodebuild.log 2>&1; then
  tail -n 120 artifacts/xcodebuild.log
  exit 1
fi

app="ios/build/Build/Products/Release-iphoneos/NEUHealth.app"
test -d "$app"
test -s "$app/main.jsbundle"
test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleSupportedPlatforms:0' "$app/Info.plist")" = "iPhoneOS"
xcrun lipo -archs "$app/NEUHealth" | grep -qw arm64
echo "Verified: arm64 iPhone app, bundled offline JavaScript, Release configuration."

mkdir -p artifacts/Payload
ditto "$app" artifacts/Payload/NEUHealth.app
(
  cd artifacts
  zip -qry NEU-Health-Student-Production.ipa Payload
)
unzip -t artifacts/NEU-Health-Student-Production.ipa | tail -n 1
echo "Unsigned IPA ready for the user's sideloading tool to sign."
