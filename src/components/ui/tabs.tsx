import type * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

// Radix defaults dir to "ltr" when not given explicitly, which forces this
// (and everything nested inside it) into LTR layout regardless of the
// document's own dir="rtl" — breaking table/form alignment on any page that
// wraps its content in Tabs.
export function Tabs(props: React.ComponentProps<typeof RadixTabs.Root>) {
  return <RadixTabs.Root dir="rtl" {...props} />;
}
export const TabsContent = RadixTabs.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn(
        "inline-flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium text-neutral-500 transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm dark:text-neutral-400 dark:data-[state=active]:bg-neutral-900 dark:data-[state=active]:text-blue-400",
        className,
      )}
      {...props}
    />
  );
}
