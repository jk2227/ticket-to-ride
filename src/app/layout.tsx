import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticket to Ride Online",
  description: "Play Ticket to Ride with friends online",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
