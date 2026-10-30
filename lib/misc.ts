import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from '@tauri-apps/api/app';

export const isEnvTauri = (): boolean => {
  return typeof window !== "undefined" && isTauri();
};

export const isEnvDev = (): boolean => {
  return process.env.NODE_ENV === "development";
};

// Will return whether the current environment is in a regular browser
// and not CEF
// export const isEnvBrowser = (): boolean => !(window as any).invokeNative; // FiveM environment
export const isEnvBrowser = (): boolean => !isTauri();

export const isEnvTauriDebug = (): boolean => {
  return (process.env.NEXT_PUBLIC_TAURI_DEBUG === "true");
};

export const getRuntime = (): "tauri" | "browser" => {
  return isTauri() ? "tauri" : "browser";
};

export const get_version = (): Promise<string> => getVersion();

// Basic no operation function
export const noop = () => {};