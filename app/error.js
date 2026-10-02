// app/error.js
'use client';

import { useEffect } from 'react';

export default function PageError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section aria-label="Page error">

        <div className="mx-auto max-w-screen-md px-3 py-10">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-gray-600">An unexpected error occurred.</p>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Try again
          </button>
        </div>

    </section>
  );
}
