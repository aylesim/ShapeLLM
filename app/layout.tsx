import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { AppShell } from "./components/app-shell";
import { parseTheme, THEME_KEY } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShapeLLM — Text, with a body",
  description:
    "A laboratory for emotional geometry. ShapeLLM reads a text on six dimensions, shows its evidence and uncertainty, and grows a 3D specimen. A Reading Room turns longer texts into temporal performances.",
  applicationName: "ShapeLLM",
  authors: [{ name: "Alessandro Miracapillo", url: "https://github.com/aylesim" }],
  openGraph: {
    title: "ShapeLLM — Text, with a body",
    description:
      "An LLM reads a text on six dimensions, shows its evidence, and grows a 3D specimen. Then it performs the text out loud.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShapeLLM — Text, with a body",
    description:
      "An LLM reads a text on six dimensions, shows its evidence, and grows a 3D specimen.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const htmlTheme = parseTheme(cookieStore.get(THEME_KEY)?.value) ?? "dark";

  return (
    <html
      lang="en"
      data-theme={htmlTheme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen font-sans">
        <ThemeProvider initialTheme={htmlTheme}>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
