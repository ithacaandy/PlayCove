
"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";

export default function EditEventPage(){
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace(`/auth?next=/edit/${id}`); return; }
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) { setMsg(error?.message || "Event not found"); return; }
      if (data.owner_id !== user.id) { setMsg("You don’t have permission to edit this post."); return; }
      setEvent(data);
      setLoading(false);
    })();
  }, [id]);

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    const form = new FormData(e.currentTarget);
    const patch = {
      title: form.get("title"),
      description: form.get("description"),
      date_iso: form.get("date_iso"),
      start_time: form.get("start_time"),
      end_time: form.get("end_time"),
      location_name: form.get("location_name"),
      city: form.get("city"),
      capacity: Number(form.get("capacity") || 0),
      age_min: Number(form.get("age_min") || 0),
      age_max: Number(form.get("age_max") || 0),
      contact: form.get("contact"),
    };
    const { error } = await supabase.from("events").update(patch).eq("id", id);
    if (error) setMsg(error.message);
    else { setMsg("Saved!"); router.replace("/mine"); }
  };

  if (loading) return null;
  if (!event) return <main className="container py-6">{msg}</main>;

  return (
    <main className="container py-6 max-w-2xl">
      <h1 className="text-lg font-semibold mb-4">Edit Post</h1>
      <form onSubmit={save} className="grid gap-3">
        <input name="title" defaultValue={event.title} className="input" placeholder="Title" required />
        <textarea name="description" defaultValue={event.description || ""} className="input" placeholder="Description" rows={4} />
        <div className="grid grid-cols-2 gap-2">
          <input name="date_iso" type="date" defaultValue={event.date_iso} className="input" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="start_time" type="time" defaultValue={event.start_time} className="input" />
            <input name="end_time" type="time" defaultValue={event.end_time} className="input" />
          </div>
        </div>
        <input name="location_name" defaultValue={event.location_name || ""} className="input" placeholder="Location" />
        <input name="city" defaultValue={event.city || ""} className="input" placeholder="City (e.g., Ithaca, NY)" />
        <div className="grid grid-cols-3 gap-2">
          <input name="capacity" type="number" defaultValue={event.capacity || 0} className="input" placeholder="Capacity" />
          <input name="age_min" type="number" defaultValue={event.age_min || 0} className="input" placeholder="Age min" />
          <input name="age_max" type="number" defaultValue={event.age_max || 0} className="input" placeholder="Age max" />
        </div>
        <input name="contact" defaultValue={event.contact || ""} className="input" placeholder="Contact (visible to RSVPers)" />
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit">Save</button>
          <button className="btn" type="button" onClick={()=>router.back()}>Cancel</button>
        </div>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </form>
    </main>
  );
}
