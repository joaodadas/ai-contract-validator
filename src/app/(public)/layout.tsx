export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[30%] left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full opacity-60 blur-[100px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(220,50,30,0.5) 0%, rgba(200,60,20,0.3) 35%, rgba(160,80,30,0.12) 60%, transparent 80%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">{children}</div>
    </div>
  );
}
