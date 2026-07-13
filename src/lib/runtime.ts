export const isElectron =
  typeof window !== "undefined" &&
  Boolean(window.electron?.isElectron);
