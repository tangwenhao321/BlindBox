import { isRunningInExpoGo } from "expo";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import type { RefObject } from "react";
import { Share, View } from "react-native";

export type CaptureHighlightResult = {
  kind: "video" | "image";
  uri: string;
};

const FRAME_COUNT = 5;
const FRAME_GAP_MS = 180;

type FfmpegModule = {
  FFmpegKit: {
    execute: (cmd: string) => Promise<{ getReturnCode: () => Promise<{ isValueSuccess?: () => boolean }> }>;
  };
};

async function loadFfmpeg(): Promise<FfmpegModule | null> {
  try {
    // Optional native module; may be absent in Expo Go / web.
    // eslint-disable-next-line import/no-unresolved -- optional peer
    return (await import("ffmpeg-kit-react-native")) as FfmpegModule;
  } catch {
    return null;
  }
}

async function captureFrame(ref: RefObject<View | null>): Promise<string | null> {
  if (!ref.current) return null;
  return captureRef(ref, { format: "png", quality: 0.92 });
}

async function composeMp4FromFrames(
  frameUris: string[],
  watermark?: { text?: string; code?: string },
): Promise<string | null> {
  const ffmpeg = await loadFfmpeg();
  if (!ffmpeg || frameUris.length < 2) return null;
  const dir = `${FileSystem.cacheDirectory ?? ""}reveal-highlight/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const listPath = `${dir}frames.txt`;
  const listBody = frameUris.map((uri) => `file '${uri.replace(/'/g, "'\\''")}'\nduration 0.35`).join("\n");
  const output = `${dir}highlight-${Date.now()}.mp4`;
  await FileSystem.writeAsStringAsync(listPath, `${listBody}\nfile '${frameUris[frameUris.length - 1]!.replace(/'/g, "'\\''")}'\n`);
  let vf = "fps=8";
  if (watermark?.text || watermark?.code) {
    const line1 = (watermark.text ?? "").replace(/[:\\']/g, " ");
    const line2 = (watermark.code ?? "").replace(/[:\\']/g, " ");
    vf = `drawtext=text='${line1}':fontsize=18:fontcolor=white@0.85:x=(w-text_w)/2:y=h-72,drawtext=text='${line2}':fontsize=12:fontcolor=white@0.65:x=(w-text_w)/2:y=h-44,fps=8`;
  }
  const cmd = `-f concat -safe 0 -i "${listPath}" -vf "${vf}" -pix_fmt yuv420p -y "${output}"`;
  const session = await ffmpeg.FFmpegKit.execute(cmd);
  const code = await session.getReturnCode();
  if (code.isValueSuccess?.()) return output;
  return null;
}

async function saveToMediaLibrary(uri: string, mimeType: string): Promise<void> {
  try {
    const MediaLibrary = await import("expo-media-library");
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) return;
    await MediaLibrary.createAssetAsync(uri);
    if (mimeType.startsWith("video")) {
      await MediaLibrary.createAlbumAsync("MysteryBox Highlights", undefined, false).catch(() => undefined);
    }
  } catch {
    /* optional */
  }
}

/**
 * Captures a short highlight clip from a view ref (dev build + ffmpeg) or a shareable still (Expo Go).
 * Watermark should be rendered inside the captured view (see RevealShareCard watermark props).
 */
export async function captureRevealHighlightVideo(
  ref: RefObject<View | null>,
  opts?: { watermarkText?: string; watermarkCode?: string },
): Promise<CaptureHighlightResult | null> {
  if (!ref.current) return null;

  const frames: string[] = [];
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const uri = await captureFrame(ref);
    if (uri) frames.push(uri);
    if (i < FRAME_COUNT - 1) {
      await new Promise((r) => setTimeout(r, FRAME_GAP_MS));
    }
  }
  if (!frames.length) return null;

  const expoGo = isRunningInExpoGo();
  if (!expoGo) {
    const mp4 = await composeMp4FromFrames(frames, {
      text: opts?.watermarkText,
      code: opts?.watermarkCode,
    });
    if (mp4) {
      await saveToMediaLibrary(mp4, "video/mp4");
      return { kind: "video", uri: mp4 };
    }
  }

  const still = frames[frames.length - 1]!;
  await saveToMediaLibrary(still, "image/png");
  return { kind: "image", uri: still };
}

export async function shareRevealHighlight(
  result: CaptureHighlightResult,
  opts?: { message?: string; url?: string },
): Promise<void> {
  if (opts?.url || opts?.message) {
    try {
      const message = opts.url
        ? `${opts.message ?? ""}\n${opts.url}`.trim()
        : (opts.message ?? "");
      await Share.share({
        message: message || opts.url || " ",
        url: opts.url,
      });
      return;
    } catch {
      /* fall through to file share */
    }
  }
  const mimeType = result.kind === "video" ? "video/mp4" : "image/png";
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType,
      dialogTitle: opts?.message,
      UTI: result.kind === "video" ? "public.mpeg-4" : "public.png",
    });
  }
}
