import { cn } from "@/lib/utils";

export const cardClassName =
  "rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

export const cardLinkClassName = cn(
  cardClassName,
  "block transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:hover:border-blue-800",
);
