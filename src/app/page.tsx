import type { Metadata } from "next";
import ThankYouExperience from "@/components/site/ThankYouExperience";

export const metadata: Metadata = {
  title: "Thank You | Capital Youth Expo Pre-Event at BUIC",
  description: "Thank you for being part of the Capital Youth Expo Pre-Event at Bahria University Islamabad.",
  robots: { index: false, follow: false },
};

export default function Home() {
  return <ThankYouExperience />;
}
