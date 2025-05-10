"use client";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 overflow-hidden">
      {/* Soft white radial gradient for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse at 60% 20%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)"
        }}
      />
      {/* Dotted grid pattern - now more visible */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,80,27,0.18) 1.7px, transparent 2.2px)",
          backgroundSize: "26px 26px",
        }}
      />
      {/* Large green gradient blob top left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 z-0 rounded-full"
        style={{
          width: 400,
          height: 400,
          background: "radial-gradient(circle at 60% 40%, #00501B 0%, #00501B11 80%, transparent 100%)",
          opacity: 0.18,
          filter: "blur(2px)"
        }}
      />
      {/* Orange organic blob bottom right */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 z-0 rounded-full"
        style={{
          width: 260,
          height: 180,
          background: "radial-gradient(circle at 80% 80%, #FDBA74 0%, #FDBA7400 80%)",
          opacity: 0.22,
          filter: "blur(1.5px)",
          marginRight: -60,
          marginBottom: -60
        }}
      />
      {/* Subtle green blob bottom left */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 z-0 rounded-full"
        style={{
          width: 220,
          height: 120,
          background: "radial-gradient(circle at 30% 70%, #00501B 0%, #00501B11 80%, transparent 100%)",
          opacity: 0.13,
          filter: "blur(2.5px)",
          marginLeft: -40,
          marginBottom: -40
        }}
      />
      {/* Extra accent: small orange circle top right */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-10 right-10 z-0 rounded-full bg-orange-200/60"
        style={{ width: 60, height: 60, filter: "blur(0.5px)" }}
      />
      {/* Extra accent: small green circle bottom center */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-1/2 z-0 -translate-x-1/2 rounded-full bg-[#00501B]/20"
        style={{ width: 48, height: 48, filter: "blur(1px)" }}
      />
      {/* Login card content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
