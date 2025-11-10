import { ArubaSpecialProvider } from "@/contexts/ArubaSpecialContext";

export default function ArubaSpecialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ArubaSpecialProvider>{children}</ArubaSpecialProvider>;
}
