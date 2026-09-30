export function Container({ children, className = "", narrow = false }: { children: React.ReactNode; className?: string; narrow?: boolean }) {
  return <div className={`mx-auto w-full ${narrow ? "max-w-3xl" : "max-w-7xl"} px-4 sm:px-6 ${className}`}>{children}</div>;
}
