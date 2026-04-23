import "./globals.css";
import type { Metadata } from "next";
import { SessionProvider } from "./components/SessionProvider";
import ChatWidget from "./components/ChatWidget";

export const metadata: Metadata = {
  title: "INSA - Security Assessment & Analysis Platform",
  description: "INSA Cyber Security Risk Assessment and Reporting System",
  icons: {
    icon: "/logo2.png",
    shortcut: "/logo2.png",
    apple: "/logo2.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <SessionProvider>
          {children}
          <ChatWidget />
        </SessionProvider>
      </body>
    </html>
  );
}

