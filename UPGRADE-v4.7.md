
# PlayCove v4.7 — Design & Navigation Bundle

## Files to copy (overwrite if present)
- `app/globals.css`
- `app/layout.js`
- `app/ClientShell.js`
- `app/components/Header.js`
- `app/components/BottomNav.js`
- `app/components/EventCard.js`

## Optional: icons
npm i lucide-react

## Use EventCard
import EventCard from "@/app/components/EventCard";
<div className="list">{events.map(ev => <EventCard key={ev.id} event={ev} />)}</div>

Ensure your query includes `group: groups ( id, name )` so the badge shows group name.
