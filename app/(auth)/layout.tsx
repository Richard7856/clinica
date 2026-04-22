export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 grid place-items-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
