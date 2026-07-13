import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { cardClassName } from "@/lib/cardStyles";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardClassName, className)} {...props} />;
}
