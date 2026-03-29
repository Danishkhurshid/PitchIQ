"use client";

import { formatMetric } from "@/lib/format";
import Link from "next/link";
import { buildPath } from "@/lib/url";

export function LiveEventFeed({ events, season }) {
  if (!events || events.length === 0) return null;

  return (
    <article className="live-event-feed surface">
      <div className="surface-header">
        <div>
          <p className="kicker">Live Stream</p>
          <h2>Match Commentary</h2>
        </div>
      </div>
      
      <div className="event-stream">
        {events.map((event, i) => (
          <div key={i} className="event-item">
            <div className={`event-icon ${event.type === 'wicket' ? 'wicket' : ''}`}>
              {event.type === 'wicket' ? 'W' : '!'}
            </div>
            <div className="event-body">
              <span className="event-meta">Over {event.ball} · {event.innings === 1 ? '1st' : '2nd'} Innings</span>
              <h3 className="event-title">
                <strong>{event.playerOut?.name || "Player"}</strong> out {event.kind}
              </h3>
              <p className="event-detail">Bowled by {event.bowler?.name || "Bowler"}</p>
            </div>
          </div>
        ))}
        
        {events.length > 0 && (
          <div className="feed-footer">
             <p className="kicker">Viewing latest {events.length} key events</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .live-event-feed {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .event-stream {
          padding-top: 10px;
          display: flex;
          flex-direction: column;
        }
        .event-item {
          display: flex;
          gap: 20px;
          padding: 24px 0;
          border-bottom: 1px solid var(--surface-border);
          transition: transform 0.2s;
        }
        .event-item:hover {
           transform: translateX(4px);
        }
        .event-item:last-child { border-bottom: none; }
        .event-icon {
          width: 48px;
          height: 48px;
          background: var(--accent);
          color: white;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.4rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .event-icon.wicket { 
          background: #ff4d4d;
          box-shadow: 0 4px 12px rgba(255, 77, 77, 0.2);
        }
        .event-body {
           display: flex;
           flex-direction: column;
           justify-content: center;
        }
        .event-meta {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--ink-soft);
          margin-bottom: 6px;
          font-weight: 700;
        }
        .event-title {
          font-size: 1.2rem;
          line-height: 1.3;
          margin: 0;
          font-weight: 400;
          color: var(--ink);
        }
        .event-title strong {
           font-weight: 800;
        }
        .event-detail {
          margin-top: 4px;
          font-size: 1rem;
          color: var(--ink-soft);
        }
        .feed-footer {
           margin-top: 20px;
           padding: 20px;
           background: var(--surface-active);
           border-radius: 16px;
           text-align: center;
        }
      `}</style>
    </article>
  );
}
