// app/loading.js
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-screen-md px-3 py-8 animate-pulse">
      <div className="h-5 w-32 rounded bg-gray-200" />
      <div className="mt-4 h-4 w-60 rounded bg-gray-200" />
      <div className="mt-2 h-4 w-40 rounded bg-gray-200" />
    </div>
  );
}
