import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PointsPilot — AI Credit Card Rewards Optimizer",
  description:
    "Describe your trip or purchase and get the best credit card recommendation in seconds. Powered by live web data via Azure OpenAI and Tavily.",
  keywords: ["credit card rewards", "points optimizer", "travel rewards", "AI financial advisor"],
  openGraph: {
    title: "PointsPilot",
    description: "AI-powered credit card rewards optimizer. Live rates, not stale presets.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
