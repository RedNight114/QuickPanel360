import Image from "next/image";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

const sources = {
  badge: "/branding/q-badge.svg",
  ink: "/branding/q-velocity-ink.svg",
  yellow: "/branding/q-velocity-yellow.svg",
  onInk: "/branding/q-velocity-on-ink.svg",
  onYellow: "/branding/q-velocity-on-yellow.svg",
} as const;

type BrandMarkVariant = keyof typeof sources;

export function BrandMark({
  variant = "ink",
  size = 24,
  alt,
  className,
}: {
  variant?: BrandMarkVariant;
  size?: number;
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      src={sources[variant]}
      alt={alt ?? branding.appName}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
