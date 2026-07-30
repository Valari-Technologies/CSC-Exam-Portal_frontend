export function MeshBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-white to-neutral-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-neutral-300/40 dark:bg-neutral-700/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neutral-400/30 dark:bg-neutral-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}
