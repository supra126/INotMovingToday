import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Monogram on the accent colour
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f5fd0",
          borderRadius: 6,
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        J
      </div>
    ),
    { ...size }
  );
}
