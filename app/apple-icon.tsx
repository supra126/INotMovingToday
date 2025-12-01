import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg
        width="180"
        height="180"
        viewBox="0 0 36 36"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
          borderRadius: "20%",
        }}
      >
        {/* Ghost body */}
        <path
          d="M18,3c-6.63,0-12,5.37-12,12v18l4.5-4.5,3.75,3.75,3.75-3.75,3.75,3.75,3.75-3.75,4.5,4.5V15c0-6.63-5.37-12-12-12Z"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.62"
        />
        {/* Smile */}
        <path
          d="M12,19.81s2.25,3,6,3,6-3,6-3"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.62"
        />
        {/* Eyes */}
        <circle cx="13.07" cy="12.97" r="1.95" fill="#ffffff" />
        <circle cx="22.93" cy="12.97" r="1.95" fill="#ffffff" />
      </svg>
    ),
    {
      ...size,
    }
  );
}
