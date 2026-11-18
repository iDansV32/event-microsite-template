import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

export type ImgPhVariant = "ocean" | "palms" | "sunset" | "pool" | "sand" | "night";

/**
 * Photo slot. Renders the image when `src` is set, on a flat tinted
 * placeholder that also shows while it loads (or when no photo exists yet).
 */
export function ImgPh({
  variant = "ocean",
  src,
  alt,
  label,
  ratio = "16/9",
  style = {},
  children,
  caption,
  priority = false,
  sizes = "(max-width: 900px) 100vw, 50vw",
}: {
  variant?: ImgPhVariant;
  src?: string;
  alt?: string;
  label?: string;
  ratio?: string;
  style?: CSSProperties;
  children?: ReactNode;
  caption?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const base: CSSProperties =
    ratio === "unset" ? { ...style } : { aspectRatio: ratio, ...style };
  return (
    <figure style={{ margin: 0, width: "100%" }}>
      <div className={`img-ph img-${variant}`} style={base}>
        {src && (
          <Image
            src={src}
            alt={alt || label || ""}
            fill
            sizes={sizes}
            priority={priority}
            style={{ objectFit: "cover", zIndex: 0 }}
          />
        )}
        {label && (
          <span className="img-ph-label">
            {!src && <Icon name="image" size={14} strokeWidth={2} />}
            {label}
          </span>
        )}
        {children}
      </div>
      {caption && (
        <figcaption style={{ fontSize: 14, color: "var(--ink-muted)", marginTop: 12 }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
