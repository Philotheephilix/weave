import React, { useState } from 'react'

interface CopyableAddressProps {
  label: string
  value: string
  truncate?: boolean
}

export default function CopyableAddress({ label, value, truncate = true }: CopyableAddressProps) {
  const [copied, setCopied] = useState(false)
  const display = truncate && value.length > 16
    ? `${value.slice(0, 8)}...${value.slice(-6)}`
    : value

  function handleClick() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => { /* permission denied */ })
  }

  return (
    <div className="copyable-address" onClick={handleClick} title={`Click to copy: ${value}`}>
      <span className="label">{label}</span>
      <code className="value">{display}</code>
      <span className="copy-icon">{copied ? '✓ Copied' : '⧉'}</span>
    </div>
  )
}
