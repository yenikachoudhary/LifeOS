import { DM_Sans, Nunito } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", weight: ["600", "700", "800", "900"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });

export const metadata = {
  title: "LifeOS — Plan less. Do more.",
  description: "A bubbly productivity and consistency tracker for students and developers.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${nunito.variable} ${dmSans.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
