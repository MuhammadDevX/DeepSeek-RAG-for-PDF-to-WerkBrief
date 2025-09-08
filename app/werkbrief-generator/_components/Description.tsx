import { ContainerTextFlip } from "@/components/ui/container-text-flip";

export function Description() {
  return (
    <div className="flex items-center align-middle justify-center text-center pt-16">
      <ContainerTextFlip
        words={["ship2aruba", "werkbrief", "generator", "with", "one", "click!"]}
      />
    </div>
  );
}
