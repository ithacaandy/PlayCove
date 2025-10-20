
export const metadata = { title: "Sign in — PlayCove" };

export default function AuthLayout({ children }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--brand)" }}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-soft p-8">
        {children}
      </div>
    </main>
  );
}
