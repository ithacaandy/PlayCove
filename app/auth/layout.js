// app/auth/layout.js
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F6C74E] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {children}
      </div>
    </div>
  );
}