import { ContainerTextFlip } from "@/components/ui/container-text-flip";

export function ArubaDescription() {
  return (
    <div className="flex items-center align-middle justify-center text-center pt-16">
      <ContainerTextFlip
        words={[
          "ship2aruba",
          "client",
          "data",
          "special",
          "processor",
          "with",
          "AI!",
        ]}
      />
    </div>
  );
}
