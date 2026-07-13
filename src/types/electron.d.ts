export {};

declare global {
  interface Window {
    electron?: {
      isElectron: boolean;
      backup?: {
        getStatus: () => Promise<{ configured: boolean; label?: string }>;
        choosePath: () => Promise<{ ok: boolean; label?: string }>;
        write: (json: string) => Promise<{ ok: boolean; error?: string }>;
        clear: () => Promise<{ ok: boolean }>;
      };
    };
  }
}
