import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind / conditional class names (shadcn-style).
 *
 * @param inputs - Class values accepted by `clsx`
 * @returns A single merged `className` string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
