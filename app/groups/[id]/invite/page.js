"use client";
import { useState } from "react";
import Link from "next/link";

export default function InvitePage({ params }){
  const groupId = params.id;
  const [email, setEmail] = useState("");
  const [result, setResult] = useState("");

  const sendInvite = async (e) => {
    e.preventDefault();
    setResult("");
    const fd = new FormData();
    fd.append("group_id", groupId);
    fd.append("email", email);
    const res = await fetch("/api/groups/invite", { method: "POST", body: fd });
    const json = await res.json();
    if(json?.acceptUrl){
      setResult(json.acceptUrl);
    } else {
      setResult(json?.error || "Something went wrong");
    }
  };

  return (
    <main className="container py-6 max-w-lg space-y-4">
      <h1 className="text-lg font-semibold">Invite to Group</h1>
      <form onSubmit={sendInvite} className="grid gap-3">
        <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="friend@example.com" required />
        <button className="btn btn-primary">Generate invite link</button>
      </form>
      {result && (
        <div className="card p-3">
          <div className="text-sm">Invite link:</div>
          <a className="underline break-all" href={result} target="_blank" rel="noreferrer">{result}</a>
          <div className="text-xs text-gray-500 mt-2">Share this link with the invited parent. They must be signed in to accept.</div>
        </div>
      )}
      <Link className="underline text-sm" href={`/groups/${groupId}/members`}>Back to Members</Link>
    </main>
  );
}
