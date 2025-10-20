
"use client";
import Link from "next/link";

export default function EventCard({ event }){
  const date = event?.date_iso ? new Date(event.date_iso) : null;
  const time = (t) => (t ? String(t).slice(0,5) : "—");
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="badge">{event?.group?.name || "Group"}</span>
        {Array.isArray(event?.tags) && event.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {event.tags.slice(0,3).map((t) => <span key={t} className="chip">{t}</span>)}
          </div>
        )}
      </div>
      <h3 className="title mb-1">{event.title}</h3>
      {event.description && <p className="meta mb-3">{event.description}</p>}

      <div className="meta mb-3">
        {date ? date.toLocaleDateString() : "TBD"} • {time(event.start_time)}–{time(event.end_time)}
        <br />
        {event.location_name} — {event.city}
      </div>

      <div className="flex gap-2">
        <Link href={`/events/${event.id}`} className="btn btn-ghost">Details</Link>
        <Link href={`/groups/${event.group_id}`} className="btn btn-primary">View Group</Link>
      </div>
    </div>
  );
}
