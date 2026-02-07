'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: '#141414', color: '#ededed', fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h1>
          <pre style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'left',
            fontSize: '0.85rem',
            color: '#ff6b6b',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {error.message}
            {error.stack && '\n\n' + error.stack}
          </pre>
          {error.digest && (
            <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#74AA9C',
              color: '#141414',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
