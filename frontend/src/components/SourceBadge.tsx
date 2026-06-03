export default function SourceBadge({
  source,
}: {
  source: "autoscout" | "subito";
}) {
  const isAutoScout = source === "autoscout";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-sm ${
        isAutoScout
          ? "bg-blue-600/90 text-white"
          : "bg-orange-500/90 text-white"
      }`}
    >
      {isAutoScout ? "AutoScout24" : "Subito.it"}
    </span>
  );
}
