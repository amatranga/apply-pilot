"use client";
import { useState } from "react";
type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  postedAt: string | null;
  canonicalApplyUrl: string | null
};

const timeScaleOptions = [
  {label: '24 hours', value: 24, id: '24'},
  {label: '3 days', value: 72, id: '72'},
  {label: '7 days', value: 168, id: '168'},
]

export default function Home() {
  const [keywords, setKeywords] = useState("Software Engineer");
  const [hours, setHours] = useState(24);
  const [token, setToken] = useState("");
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
          query: { keywords, country: "us", remoteOnly: true, postedWithinHours: hours, maxPages: 1 }
        })
      });

      if (!created.ok) throw new Error(await created.text());
      
      const { id } = await created.json();
      const run = await fetch(`/api/searches/${id}/run`, { method: "POST", headers: headers() });
      
      if (!run.ok) throw new Error(await run.text());
      
      setMessage("Queued. Wait for the worker, then click Refresh jobs.");
    } catch (error) {
      setMessage(String(error));
    }
  }
  
  async function refresh() {
    try {
      const response = await fetch("/api/jobs", { headers: headers() });
      
      if (!response.ok) throw new Error(await response.text());
      
      setJobs((await response.json()).jobs);
      setMessage("Jobs refreshed");
    } catch (error) {
      setMessage(String(error));
    }
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
      </label>
      
      {" "}
      
      <label>Posted within
        <select value={hours} onChange={e => setHours(Number(e.target.value))}>
          {timeScaleOptions.map(opt => (
            <option key={opt.id} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      {" "}

      <button onClick={search}>Queue remote US search</button>
      {" "}
      <button onClick={refresh}>Refresh jobs</button>

      <p role="status">{message}</p>
      <ul>{jobs.map(job => 
        <li key={job.id}>
          <strong>{job.title}</strong> — {job.company}
          ({job.location ?? "Location unspecified"})
          {job.postedAt && `— ${new Date(job.postedAt).toLocaleString()}`}
          {job.canonicalApplyUrl && <a href={job.canonicalApplyUrl} target="_blank" rel="noopener noreferrer">Apply</a>}
        </li>)}
      </ul>
    </main>
  );
}
