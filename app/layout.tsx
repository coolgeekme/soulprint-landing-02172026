import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoulPrint — AI that remembers you",
  description: "Import your ChatGPT history. Get an AI that actually knows you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-black">
        {children}
      </body>
    </html>
  );
}
