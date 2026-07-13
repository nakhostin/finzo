export {};

// The File System Access API isn't in TypeScript's bundled DOM lib yet.
// Chromium-only (Chrome/Edge); guarded at runtime via isSupported().
declare global {
  type FileSystemPermissionState = "granted" | "denied" | "prompt";

  interface FileSystemHandlePermissionDescriptor {
    mode?: "read" | "readwrite";
  }

  interface FileSystemHandle {
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<FileSystemPermissionState>;
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<FileSystemPermissionState>;
  }

  interface DirectoryPickerOptions {
    mode?: "read" | "readwrite";
  }

  interface Window {
    showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  }
}
