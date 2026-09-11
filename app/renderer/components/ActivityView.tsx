import React from 'react'

const ACTIVITIES = [
  {
    id: 'a1',
    icon: 'ph-at-duotone',
    title: 'Alice mentioned you in #general',
    body: 'Hey @you, can you review the transport patch?',
    time: '10 min ago',
  },
  {
    id: 'a2',
    icon: 'ph-chat-dots-duotone',
    title: 'Bob replied to your message',
    body: 'Yep the DHT fix looks correct.',
    time: '32 min ago',
  },
  {
    id: 'a3',
    icon: 'ph-star-duotone',
    title: 'Carol reacted to your message',
    body: '🎉 in #ops',
    time: '1 hr ago',
  },
  {
    id: 'a4',
    icon: 'ph-shield-check-duotone',
    title: 'New stealth match detected',
    body: 'Notification Log matched address 0xabcd…ef12',
    time: '2 hr ago',
  },
  {
    id: 'a5',
    icon: 'ph-user-plus-duotone',
    title: 'Dave joined Engineering',
    body: 'dave.weave.eth accepted your invite',
    time: 'Yesterday',
  },
]

export default function ActivityView() {
  return (
    <div className="main-area">
      <div className="view-header">
        <span className="view-header-title">Activity</span>
        <div className="view-header-spacer" />
        <button className="view-header-btn">Mark all read</button>
      </div>

      <div className="activity-list">
        {ACTIVITIES.map(a => (
          <div key={a.id} className="activity-item">
            <div className="activity-icon">
              <i className={`ph-duotone ${a.icon}`} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="activity-title">{a.title}</div>
              <div className="activity-body">{a.body}</div>
            </div>
            <div className="activity-time">{a.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
