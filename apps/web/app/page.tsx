"use client";
import { useState } from "react";
import CandidateProfileEditor from "./components/CandidateProfileEditor";

type SavedSearch = { 
  id: string; 
  name: string; 
  enabled: boolean; 
  intervalMinutes: number; 
  nextRunAt: string|null; 
  query: { 
    keywords: string;
    postedWithinHours: number
  } 
};

type Run = {
  id: string;
  status: string;
  jobsFound: number;
  jobsNew: number;
  error: string|null;
  createdAt: string
};

type Job = { 
  id: string;
  title: string;
  company: string;
  location: string | null;
  postedAt: string | null;
  canonicalApplyUrl: string | null 
};

export default function Home() {
  const [keywords, setKeywords] = useState("Software Engineer");
  const [hours, setHours] = useState(24);
  const [token, setToken] = useState("");
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [runs, setRuns] = useState<Record<string,Run[]>>({});
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState("");
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

  async function search() {
    setMessage("Creating search...");
    try {
      const created = await fetch("/api/searches", { 
        method: "POST", 
        headers: headers(), 
        body: JSON.stringify({ 
          name: `${keywords} - ${hours}h`, 
          intervalMinutes, 
          query: { keywords, country: "us", remoteOnly: true, postedWithinHours: hours, maxPages: 1 } 
        }) 
      });

      if (!created.ok) throw new Error(await created.text());

      const { id } = await created.json();
      const run = await fetch(`/api/searches/${id}/run`, { method: "POST", headers: headers() });

      if (!run.ok) throw new Error(await run.text());

      setMessage("Queued. Wait for the worker, then click Refresh jobs.");

      await loadSearches();

    } catch (error) { setMessage(String(error)); }
  }

  async function loadSearches() {
    const res = await fetch("/api/searches", { headers: headers() });

    if (!res.ok) throw new Error(await res.text());

    setSavedSearches((await res.json()).searches);
  }

  async function toggleSearch(s: SavedSearch) {
    const res = await fetch(`/api/searches/${s.id}`,{ 
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ enabled: !s.enabled })
    });

    if(!res.ok) throw new Error(await res.text());

    await loadSearches();
  }

  async function runSaved(id: string) {
    const res = await fetch(`/api/searches/${id}/run`, {
      method: "POST",
      headers:headers()
    });

    if(!res.ok) throw new Error(await res.text());
    
    setMessage("Search queued");
    
    await loadRuns(id);
  }

  async function loadRuns(id: string) {
  // If history is already expanded, collapse it.
    if (runs[id] !== undefined) {
      setRuns(old => {
        const updated = { ...old };
        delete updated[id];
        return updated;
      });
      return;
    }

    // Otherwise, fetch and expand history.
    const res = await fetch(`/api/searches/${id}/runs`, {
      headers: headers(),
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();

    setRuns(old => ({
      ...old,
      [id]: data.runs,
    }));
  }

  async function refresh() {
    try {
      const response = await fetch("/api/jobs", { headers: headers() });
      
      if (!response.ok) throw new Error(await response.text());
      
      setJobs((await response.json()).jobs);
      setMessage("Jobs refreshed");

    } catch (error) { setMessage(String(error)); }
  }

  return (
    <main>
      <h1>ApplyPilot — Discovery</h1>
      <p>Local single-user prototype. Enter the API token from your environment.</p>
      
      <label>API token 
        <input type="password" value={token} onChange={e => setToken(e.target.value)} />
      </label>
      
      <br/>
      <br/>
      
      <label>Keywords 
        <input value={keywords} onChange={e => setKeywords(e.target.value)} />
      </label>{" "}
        
      <label>Posted within 
        <select value={hours} onChange={e => setHours(Number(e.target.value))}>
          <option value={24}>24 hours</option>
          <option value={72}>3 days</option>
          <option value={168}>7 days</option>
        </select>
      </label>{" "}
        
      <label>Repeat 
        <select value={intervalMinutes} onChange={e => setIntervalMinutes(Number(e.target.value))}>
          <option value={360}>Every 6 hours</option>
          <option value={720}>Every 12 hours</option>
          <option value={1440}>Daily</option>
          <option value={10080}>Weekly</option>
        </select>
      </label>{" "}
        
      <button onClick={search}>Save and queue search</button>{" "}
      <button onClick={refresh}>Refresh jobs</button>
      
      <p role="status">{message}</p>

      <CandidateProfileEditor token={token} />
      
      <h2>Saved searches</h2>
      
      <button onClick={()=>loadSearches().catch(e=>setMessage(String(e)))}>Load saved searches</button>
      
      <ul>
        {savedSearches.map(s=>
          <li key={s.id}>
            <strong>{s.name}</strong> 
              — {s.enabled? "Enabled": "Paused"} 
              — every {s.intervalMinutes} minutes 
              — next {s.nextRunAt?new Date(s.nextRunAt).toLocaleString(): "not scheduled"}
            {" "}
            
            <button onClick={()=>toggleSearch(s).catch(e=>setMessage(String(e)))}>{s.enabled?"Pause":"Resume"}</button>{" "}
            
            <button disabled={!s.enabled} onClick={()=>runSaved(s.id).catch(e=>setMessage(String(e)))}>Run now</button>{" "}
            
            <button
              onClick={() =>
                loadRuns(s.id).catch(e => setMessage(String(e)))
              }
              aria-expanded={runs[s.id] !== undefined}
            >
              {runs[s.id] !== undefined ? "Hide History" : "History"}
            </button>

            <ul>
              {(runs[s.id]??[]).map(r=>
                <li key={r.id}>
                  {r.status} 
                  — {r.jobsFound} found, 
                  {r.jobsNew} new {r.error&&`— ${r.error}`}
                </li>
              )}
            </ul>
          </li>
        )}
      </ul>

      <h2>Discovered jobs</h2>
      
      <ul>
        {jobs.map(job =>
          <li key={job.id}>
            <strong>{job.title}</strong> 
            — {job.company} 
            ({job.location ?? "Location unspecified"}) 
            {job.postedAt && `— ${new Date(job.postedAt).toLocaleString()}`} 
            {job.canonicalApplyUrl && 
              <a href={job.canonicalApplyUrl} target="_blank" rel="noopener noreferrer">Apply</a>}
          </li>
        )}
      </ul>
    </main>
  );
}
