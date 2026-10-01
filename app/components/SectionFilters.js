'use client';
import { useEffect, useRef, useState } from 'react';
export default function SectionFilters({ title, sections, values, onChange, light = false }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null), panel = useRef(null);
  const active = sections.some((section) => values[section.key] !== section.options[0][0]);
  function close() { setOpen(false); trigger.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const key = (event) => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const nodes = panel.current?.querySelectorAll('button, input, select');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open]);
  return <>
    <button ref={trigger} type="button" aria-label={`Open ${title.toLowerCase()} filters`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className="relative flex h-10 w-10 flex-col items-end justify-center gap-1 rounded-lg p-2 hover:bg-white/20">
      {[6,4,2].map((width) => <span key={width} style={{width:width*4}} className={`block h-[2px] rounded-full ${light ? 'bg-white' : 'bg-black'}`} />)}
      {active && <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-blue-600" />}
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 text-gray-900 sm:items-center" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${title} filters`} className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-8 shadow-xl outline-none sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{title} filters</h2><button type="button" onClick={close} className="rounded-md border px-3 py-2">Close</button></div>
        {sections.map((section) => <fieldset key={section.key} className="mb-5"><legend className="mb-2 text-sm font-medium">{section.label}</legend><div className="flex flex-wrap gap-2">
          {section.options.map(([value,label]) => <label key={value} className={`cursor-pointer rounded-full border px-4 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600 ${values[section.key] === value ? 'border-black bg-black text-white' : 'bg-white'}`}><input type="radio" className="sr-only" name={`filter-${section.key}`} checked={values[section.key] === value} onChange={() => onChange({...values,[section.key]:value})} />{label}</label>)}
        </div></fieldset>)}
        <div className="flex gap-3"><button type="button" className="rounded-xl border px-4 py-3" onClick={() => onChange(Object.fromEntries(sections.map((section) => [section.key,section.options[0][0]])))}>Reset</button><button type="button" className="flex-1 rounded-xl bg-yellow-300 px-4 py-3 font-medium" onClick={close}>Show results</button></div>
      </section>
    </div>}
  </>;
}
