import type { KaleidoscopeApi } from "@kaleidoscope/contracts";

declare global {
  interface Window {
    kaleidoscope: KaleidoscopeApi;
  }
}

export {};
