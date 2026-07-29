import type { AiStuApi } from "@aistu/contracts";

declare global {
  interface Window {
    aistu: AiStuApi;
  }
}

export {};
