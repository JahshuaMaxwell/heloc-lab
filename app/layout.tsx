import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { PlannerProvider } from "@/components/planner-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Legacy Builders HELOC Strategy Calculator",
  description:
    "Educational HELOC strategy calculator for Legacy Builders Enterprise Group workshops. Compare repayment methods with a daily interest model.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>
          <PlannerProvider>
            <AppShell>{children}</AppShell>
          </PlannerProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
