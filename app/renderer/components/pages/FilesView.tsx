'use client'
import { useState } from 'react'
import type { FileRow } from '@/lib/types'

interface FilesViewProps {
  files: FileRow[]
}

export default function FilesView({ files }: FilesViewProps) {
  const [uploadHover, setUploadHover] = useState(false)

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-.015em' }}>Files</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(32,30,29,.72)' }}>Encrypted with ChaCha20-Poly1305 before upload. IPFS nodes hold ciphertext; the key travels over Noise_XX only.</p>
        </div>
        <button
          onMouseEnter={() => setUploadHover(true)}
          onMouseLeave={() => setUploadHover(false)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, padding: '8px 14px', background: uploadHover ? '#1186ac' : '#0088b0', color: '#f3f2f2', borderRadius: 2, cursor: 'pointer' }}>
          <i className="ph-duotone ph-upload-simple" style={{ fontSize: 16 }}></i>Upload
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
        {files.map((f, i) => {
          const [cardHover, setCardHover] = useState(false)
          return (
            <div key={i}
              onMouseEnter={() => setCardHover(true)}
              onMouseLeave={() => setCardHover(false)}
              style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 13, background: '#eae9e9', borderRadius: 2, boxShadow: cardHover ? '0 3px 10px rgba(45,43,43,.16)' : 'none', cursor: 'pointer' }}>
              <div style={{ height: 96, background: 'repeating-linear-gradient(135deg,#d7d3d3 0 3px,#e4e2e2 3px 6px)', display: 'grid', placeItems: 'center' }}>
                <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.7)' }}>{f.kind}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
              <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.cid}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'rgba(32,30,29,.7)' }}>
                <span>{f.by}</span><span>·</span><span>{f.size}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
