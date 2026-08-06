import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

export type ImgPhVariant = "ocean" | "palms" | "sunset" | "pool" | "sand" | "night";

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
}) {
  const base: CSSProperties = ratio === "unset" ? { ...style } : { aspectRatio: ratio, ...style };
  return (
    <div style={{ width: "100%" }}>
      <div className={`img-ph img-${variant}`} style={base}>
        {src && (
          <Image
            src={src}
            alt={alt || label || ""}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            priority={priority}
            style={{ objectFit: "cover", zIndex: 0 }}
          />
        )}
        {label && <span className="img-ph-label">{label}</span>}
        {children}
      </div>
      {caption && (
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-55)",
            marginTop: 10,
            letterSpacing: "0.02em",
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
