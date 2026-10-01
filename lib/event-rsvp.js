export async function setEventRsvp(supabase, eventId, userId, attending) {
  if (!userId) throw new Error('Please sign in first.');
  if (!attending) {
    const { error } = await supabase.from('rsvps').delete().match({ event_id: eventId, user_id: userId });
    if (error) throw error;
    return;
  }
  const { data: event, error: eventError } = await supabase.from('events')
    .select('id, owner_id, is_hidden, cancelled_at').eq('id', eventId).maybeSingle();
  if (eventError) throw eventError;
  if (!event) throw new Error('Event not found.');
  if (event.cancelled_at) throw new Error('This event has been cancelled.');
  if (event.is_hidden) throw new Error('This event is no longer available.');
  if (event.owner_id === userId) throw new Error('You are the host of this event.');
  // The database trigger counts all RSVPs and enforces capacity under a row lock.
  const { error } = await supabase.from('rsvps').insert({ event_id: eventId, user_id: userId });
  if (error && error.code !== '23505') throw error;
}