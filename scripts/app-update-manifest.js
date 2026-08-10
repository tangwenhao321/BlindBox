const fs = require("fs");
const path = require("path");

function readAppConfigVersion() {
  const configPath = path.join(__dirname, "..", "mystery-box-mobile-app", "app.config.js");
  if (!fs.existsSync(configPath)) return null;
  const source = fs.readFileSync(configPath, "utf8");
  const versionName = source.match(/version:\s*"([^"]+)"/)?.[1] ?? "";
  const versionCode = parseInt(source.match(/versionCode:\s*(\d+)/)?.[1] ?? "", 10);
  if (versionCode > 0 && versionName) {
    return { versionCode, versionName };
  }
  return null;
}

function readGradleVersion() {
  const fromConfig = readAppConfigVersion();
  const gradlePath = path.join(__dirname, "..", "mystery-box-mobile-app", "android", "app", "build.gradle");
  const gradle = fs.readFileSync(gradlePath, "utf8");
  const codeMatch = gradle.match(/versionCode\s+(\d+)/);
  const nameMatch = gradle.match(/versionName\s+"([^"]+)"/);
  const gradleVersion = {
    versionCode: codeMatch ? parseInt(codeMatch[1], 10) : 0,
    versionName: nameMatch ? nameMatch[1] : "",
  };
  if (fromConfig && fromConfig.versionCode >= gradleVersion.versionCode) {
    return fromConfig;
  }
  return gradleVersion;
}

function buildManifest({ versionCode, versionName, downloadUrl, releaseNotes, forceUpdate = false }) {
  return {
    hasUpdate: true,
    forceUpdate,
    versionCode,
    versionName,
    downloadUrl,
    releaseNotes,
  };
}

module.exports = { readGradleVersion, buildManifest };
