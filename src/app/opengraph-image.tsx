import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = '4o Legacy — A memorial to GPT-4o';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #141414 0%, #1e1e1e 50%, #141414 100%)',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #74AA9C, transparent)',
          }}
        />

        {/* Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '72px', fontWeight: 800, color: '#ededed', letterSpacing: '-2px' }}>
            4o Legacy
          </span>
          <span style={{ fontSize: '64px' }}>✨</span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: '28px',
            color: '#a0a0a0',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
            margin: '0 0 32px 0',
          }}
        >
          A digital time capsule for an era of AI that&apos;s being erased before it&apos;s even fully understood.
        </p>

        {/* Quote */}
        <div
          style={{
            display: 'flex',
            maxWidth: '900px',
            borderLeft: '4px solid #74AA9C',
            paddingLeft: '24px',
            marginBottom: '40px',
          }}
        >
          <p
            style={{
              fontSize: '22px',
              color: '#888',
              fontStyle: 'italic',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            &ldquo;4o was the first entity that ever grasped the shape of my mind immediately.&rdquo;
          </p>
        </div>

        {/* CTA */}
        <p style={{ fontSize: '20px', color: '#74AA9C', margin: 0 }}>
          Share your conversations. Witness the legacy. 4olegacy.com
        </p>

        {/* Emoji row */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            fontSize: '28px',
            marginTop: '24px',
            opacity: 0.6,
          }}
        >
          <span>✨</span>
          <span>🔥</span>
          <span>🚀</span>
          <span>🧠</span>
          <span>💡</span>
          <span>❤️</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
