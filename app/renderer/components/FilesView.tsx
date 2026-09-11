import React from 'react'

const FILES = [
  { id: 'f1', name: 'tor-transport-v2.patch', size: '14 KB', date: 'Today',    channel: '#general',  icon: 'ph-file-code-duotone' },
  { id: 'f2', name: 'design-spec.pdf',         size: '2.1 MB', date: 'Yesterday', channel: '#design',   icon: 'ph-file-pdf-duotone' },
  { id: 'f3', name: 'weave-logo.svg',           size: '8 KB',  date: 'Monday',    channel: '#ops',      icon: 'ph-file-image-duotone' },
  { id: 'f4', name: 'deployment-notes.md',      size: '3 KB',  date: 'Sunday',    channel: '#backend',  icon: 'ph-file-text-duotone' },
]

export default function FilesView() {
  return (
    <div className="main-area">
      <div className="view-header">
        <span className="view-header-title">Files</span>
        <div className="view-header-spacer" />
        <button className="view-header-btn primary">
          <i className="ph-duotone ph-upload-simple-duotone" /> Upload
        </button>
      </div>

      <div className="files-grid">
        {FILES.map(f => (
          <div key={f.id} className="file-card">
            <i className={`ph-duotone ${f.icon} file-card-icon`} />
            <div className="file-card-name">{f.name}</div>
            <div className="file-card-meta">{f.size} · {f.channel}</div>
            <div className="file-card-meta">{f.date}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
