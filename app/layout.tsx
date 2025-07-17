"use client"; 

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";

const ReactTogetherWrapper = dynamic(
  () => import("./components/ReactTogetherWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    ),
  }
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" href="/bombandaks.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Monad Together</title>
        <meta property="og:title" content="Monad Together" />
        <meta property="og:description" content="Complete the Monad tiles withe the community!" />
        <meta property="og:image" content="/img/bombandakcover.jpg" />
        <meta property="og:url" content="" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Monad Together" />
        <meta name="twitter:description" content="Complete the Monad tiles withe the community!" />
        <meta name="twitter:image" content="/img/bombandakcover.jpg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactTogetherWrapper>{children}</ReactTogetherWrapper>
      </body>
    </html>
  );
}
