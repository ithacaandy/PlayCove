"use client";
import Link from "next/link";
import Avatar from "./Avatar";

export default function EventCard({ event, status = "going" }) {
  const date = event?.date_iso ? new Date(event.date_iso) : null;

  const month = date
    ? String(date.getMonth() + 1).padStart(2, "0")
    : "--";

  const day = date
    ? String(date.getDate()).padStart(2, "0")
    : "--";

  const statusMap = {
    going: "Going",
    maybe: "Maybe",
    invited: "You're Invited!",
    host: "Hosted by You",
  };

  const hasImage = !!event?.image_url;

  return (
    <Link href={`/events/${event.id}`}>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--paper)]">
        <div
          className="relative h-44 w-full bg-cover bg-center"
          style={
            hasImage
              ? { backgroundImage: `url(${event.image_url})` }
              : { backgroundColor: "var(--paper)" }
          }
        >
          {!hasImage && (
            <div className="absolute bottom-[10px] left-3 right-[70px]">
              <div className="text-lg font-semibold leading-tight text-[var(--ink)]">
                {event.title}
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex items-start justify-between">
              <div className="pointer-events-auto rounded-full border border-[var(--border)] bg-white px-2 py-1 text-[11px] text-[var(--ink)] shadow-sm">
                {statusMap[status]}
              </div>

              <div className="pointer-events-auto">
                <Avatar
                  name={event?.owner?.full_name || ''}
                  src={event?.owner?.avatar_url || null}
                  size="sm"
                />
              </div>
            </div>

            <div className="flex items-end justify-end">
              <div className="relative translate-y-[14px]">
                <div className="rounded border border-black bg-white px-2 py-1 text-center text-[11px] font-semibold leading-tight text-[var(--ink)] shadow">
                  <div>{month}</div>
                  <div className="my-[2px] border-t border-black" />
                  <div>{day}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="truncate border-t border-black bg-[var(--sunshine-600)] px-3 py-2 text-sm font-bold text-white">
          {event.title}
        </div>
      </div>
    </Link>
  );
}