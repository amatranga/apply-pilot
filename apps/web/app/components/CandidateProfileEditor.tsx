'use client';

import { useState } from 'react';
import type { CandidateProfileInput } from '../api/_lib/candidate-profile';

const initial: CandidateProfileInput = {
  name: '',
  headline: null,
  location: null,
  yearsOfExperience: null,
  skills: { primary: [], secondary: [] },
  preferences: {
    targetTitles: [],
    workplaceTypes: ['REMOTE'],
    employmentTypes: ['FULL_TIME'],
    minimumBaseSalary: null,
    preferredIndustries: [],
    excludedCompanies: [],
  },
};

const fromLines = (value: string) => [
  ...new Set(
    value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
  ),
];

type ProfileResponse = { profile: CandidateProfileInput | null };

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState(() => value.join('\n'));

  return (
    <label style={{ display: 'block', margin: '0.6rem 0' }}>
      {label} (one per line)
      <textarea
        style={{
          display: 'block',
          width: 'min(100%, 32rem)',
          minHeight: '5rem',
        }}
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          onChange(fromLines(next));
        }}
      />
    </label>
  );
}

export default function CandidateProfileEditor({ token }: { token: string }) {
  const [profile, setProfile] = useState<CandidateProfileInput>(initial);
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  async function load() {
    setBusy(true);
    try {
      const response = await fetch('/api/profile', { headers: headers() });
      if (!response.ok) throw new Error(await response.text());
      const data: ProfileResponse = await response.json();
      setProfile(data.profile ?? initial);
      setLoaded(true);
      setEditing(true);
      setMessage(data.profile ? 'Profile loaded' : 'No profile saved yet');
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error(await response.text());
      setMessage('Profile saved');
      setEditing(false);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  function textField(
    label: string,
    value: string,
    onChange: (value: string) => void
  ) {
    return (
      <label style={{ display: 'block', margin: '0.6rem 0' }}>
        {label}{' '}
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }

  function toggle<T extends string>(current: T[], option: T): T[] {
    return current.includes(option)
      ? current.filter((x) => x !== option)
      : [...current, option];
  }

  return (
    <section aria-label="Candidate profile">
      <h2>Candidate profile</h2>
      <p>
        One profile for the MVP. Saved preferences will be used by the matching
        engine.
      </p>

      {!loaded && (
        <button disabled={busy || !token} onClick={load}>
          Load profile
        </button>
      )}

      {!loaded ? (
        <p>Load your profile to begin editing.</p>
      ) : editing ? (
        <>
          {textField('Name', profile.name, (name) =>
            setProfile((p) => ({ ...p, name }))
          )}
          {textField('Headline', profile.headline ?? '', (headline) =>
            setProfile((p) => ({ ...p, headline: headline || null }))
          )}
          {textField('Location', profile.location ?? '', (location) =>
            setProfile((p) => ({ ...p, location: location || null }))
          )}

          <label>
            Years of experience{' '}
            <input
              type="number"
              min={0}
              max={70}
              value={profile.yearsOfExperience ?? ''}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  yearsOfExperience:
                    e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            />
          </label>

          <h3>Skills</h3>
          <ListField
            label="Primary Skills"
            value={profile.skills.primary}
            onChange={(primary) =>
              setProfile((p) => ({ ...p, skills: { ...p.skills, primary } }))
            }
          />
          <ListField
            label="Secondary Skills"
            value={profile.skills.secondary}
            onChange={(secondary) =>
              setProfile((p) => ({ ...p, skills: { ...p.skills, secondary } }))
            }
          />

          <h3>Job preferences</h3>
          <ListField
            label="Target titles"
            value={profile.preferences.targetTitles}
            onChange={(targetTitles) =>
              setProfile((p) => ({
                ...p,
                preferences: { ...p.preferences, targetTitles },
              }))
            }
          />

          <fieldset>
            <legend>Workplace types</legend>
            {(['REMOTE', 'HYBRID', 'ONSITE'] as const).map((option) => (
              <label key={option} style={{ marginRight: '1rem' }}>
                <input
                  type="checkbox"
                  checked={profile.preferences.workplaceTypes.includes(option)}
                  onChange={() =>
                    setProfile((p) => ({
                      ...p,
                      preferences: {
                        ...p.preferences,
                        workplaceTypes: toggle(
                          p.preferences.workplaceTypes,
                          option
                        ),
                      },
                    }))
                  }
                />
                {option}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Employment types</legend>
            {(['FULL_TIME', 'CONTRACT', 'PART_TIME'] as const).map((option) => (
              <label key={option} style={{ marginRight: '1rem' }}>
                <input
                  type="checkbox"
                  checked={profile.preferences.employmentTypes.includes(option)}
                  onChange={() =>
                    setProfile((p) => ({
                      ...p,
                      preferences: {
                        ...p.preferences,
                        employmentTypes: toggle(
                          p.preferences.employmentTypes,
                          option
                        ),
                      },
                    }))
                  }
                />
                {option}
              </label>
            ))}
          </fieldset>

          <label>
            Minimum annual base salary (USD){' '}
            <input
              type="number"
              min={0}
              value={profile.preferences.minimumBaseSalary ?? ''}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  preferences: {
                    ...p.preferences,
                    minimumBaseSalary:
                      e.target.value === '' ? null : Number(e.target.value),
                  },
                }))
              }
            />
          </label>

          <ListField
            label="Preferred industries"
            value={profile.preferences.preferredIndustries}
            onChange={(preferredIndustries) =>
              setProfile((p) => ({
                ...p,
                preferences: { ...p.preferences, preferredIndustries },
              }))
            }
          />
          <ListField
            label="Excluded companies"
            value={profile.preferences.excludedCompanies}
            onChange={(excludedCompanies) =>
              setProfile((p) => ({
                ...p,
                preferences: { ...p.preferences, excludedCompanies },
              }))
            }
          />

          <p>
            <button
              disabled={
                busy ||
                !token ||
                !profile.name.trim() ||
                !profile.preferences.workplaceTypes.length ||
                !profile.preferences.employmentTypes.length
              }
              onClick={save}
            >
              Save profile
            </button>
          </p>
        </>
      ) : (
        <button disabled={busy} onClick={() => setEditing(true)}>
          Edit profile
        </button>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
