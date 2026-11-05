import React from "react";

export function CurvedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Top Left Soft Ambient Glow */}
      <div
        className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full opacity-70 blur-3xl"
        style={{
          background: "radial-gradient(circle, #DBEAFE 0%, #EFF6FF 55%, transparent 75%)",
        }}
      />

      {/* Top Right Subtle Ambient Glow */}
      <div
        className="absolute -top-24 -right-24 w-[550px] h-[550px] rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(circle, #BFDBFE 0%, #DBEAFE 50%, transparent 75%)",
        }}
      />

      {/* Upper-Left Flowing Soft Wave (Matching Reference Image) */}
      <div className="absolute left-0 top-0 w-[45vw] max-w-[650px] h-[450px] sm:h-[550px] opacity-75 pointer-events-none">
        <svg
          viewBox="0 0 650 550"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover object-left"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80 C 180 120 320 260 420 380 C 500 480 480 540 400 550 L 0 550 Z"
            fill="url(#upperLeftWaveGrad)"
          />
          <defs>
            <linearGradient id="upperLeftWaveGrad" x1="0" y1="80" x2="450" y2="550" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DBEAFE" stopOpacity="0.75" />
              <stop offset="0.6" stopColor="#EFF6FF" stopOpacity="0.45" />
              <stop offset="1" stopColor="#F8FAFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom-Right Prominent Swooping Wave (Matching Reference Image Signature Shape) */}
      <div className="absolute right-0 top-[100px] sm:top-[140px] w-[62vw] max-w-[950px] h-[680px] sm:h-[850px] pointer-events-none">
        <svg
          viewBox="0 0 950 850"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover object-right-bottom"
          preserveAspectRatio="none"
        >
          {/* Layer 1: Soft Outer Sky Wave */}
          <path
            d="M950 60 C 720 140 500 360 320 500 C 160 620 60 720 0 850 L 950 850 Z"
            fill="url(#outerBlueWave)"
          />

          {/* Layer 2: Deeper Inner Wave with Vibrant Blue Gradient */}
          <path
            d="M950 200 C 760 270 580 450 420 580 C 290 690 190 770 120 850 L 950 850 Z"
            fill="url(#innerBlueWave)"
          />

          <defs>
            <linearGradient id="outerBlueWave" x1="950" y1="60" x2="200" y2="850" gradientUnits="userSpaceOnUse">
              <stop stopColor="#BFDBFE" stopOpacity="0.65" />
              <stop offset="0.5" stopColor="#93C5FD" stopOpacity="0.75" />
              <stop offset="1" stopColor="#60A5FA" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="innerBlueWave" x1="950" y1="200" x2="350" y2="850" gradientUnits="userSpaceOnUse">
              <stop stopColor="#93C5FD" stopOpacity="0.7" />
              <stop offset="0.45" stopColor="#60A5FA" stopOpacity="0.85" />
              <stop offset="1" stopColor="#2563EB" stopOpacity="0.95" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
