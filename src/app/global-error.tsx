"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Global error boundary — catches any uncaught React errors and shows
 * a friendly fallback instead of a white screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for debugging
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
            background: "#0a0a0f",
            color: "#e0e0e0",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <Button
              onClick={reset}
              style={{
                background: "linear-gradient(135deg, #0099FF, #00BFFF)",
                color: "white",
                border: "none",
                padding: "0.5rem 1.5rem",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
