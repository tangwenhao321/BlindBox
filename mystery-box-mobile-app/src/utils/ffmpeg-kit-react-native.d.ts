declare module "ffmpeg-kit-react-native" {
  export const FFmpegKit: {
    execute: (command: string) => Promise<{
      getReturnCode: () => Promise<{ isValueSuccess?: () => boolean }>;
    }>;
  };
}
