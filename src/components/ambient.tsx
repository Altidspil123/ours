export function Ambient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* silk sheen at the top */}
      <img
        src="/img/silk.jpg"
        alt=""
        className="absolute -top-56 left-1/2 h-[72vh] w-[160vw] -translate-x-1/2 object-cover opacity-[0.14] [mask-image:radial-gradient(62%_62%_at_50%_30%,black,transparent)]"
      />
      {/* drifting light */}
      <div className="animate-drift-slow absolute -left-40 top-1/4 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(229,109,138,0.15),transparent_65%)] blur-3xl" />
      <div className="animate-drift-slower absolute -right-56 top-2/3 h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(180,140,226,0.12),transparent_65%)] blur-3xl" />
      <div className="animate-pulse-soft absolute bottom-[-10rem] left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(207,79,113,0.09),transparent_70%)] blur-3xl" />
      {/* dim the floor */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_115%,rgba(12,8,16,0.92),transparent_55%)]" />
    </div>
  );
}
