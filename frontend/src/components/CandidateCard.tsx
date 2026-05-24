import { MapPin, Clock, Briefcase, AlertTriangle } from 'lucide-react'
import type { Candidate } from '../types'
import ScoreChip from './ScoreChip'

interface CandidateCardProps {
  candidate: Candidate
  /** If true, renders as a full swipe card; otherwise renders as a compact grid card */
  variant?: 'swipe' | 'grid'
  onClick?: () => void
}

export default function CandidateCard({
  candidate: c,
  variant = 'grid',
  onClick,
}: CandidateCardProps) {
  const flags = Array.isArray(c.flagsJson) ? (c.flagsJson as string[]) : []
  const jobs = Array.isArray(c.jobsJson) ? c.jobsJson : []
  const skills = Array.isArray(c.skillsJson) ? (c.skillsJson as string[]) : []
  const firstJob = jobs[0] as { role?: string; employer?: string; start?: string; end?: string } | undefined

  if (variant === 'swipe') {
    return (
      <div
        className="card p-6 w-full max-w-sm select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{c.name ?? 'Unknown'}</h2>
            {c.location && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin size={12} /> {c.location}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            <ScoreChip label="Match" value={c.matchScore} />
            <ScoreChip label="Willing" value={c.willingScore} />
          </div>
        </div>

        {/* AI Summary */}
        {c.aiSummary && (
          <p className="text-sm text-slate-700 italic mb-3 leading-relaxed">
            "{c.aiSummary}"
          </p>
        )}

        {/* Most recent role */}
        {firstJob && (
          <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-2">
            <Briefcase size={14} className="shrink-0" />
            <span>
              {firstJob.role} @ {firstJob.employer}
              {firstJob.start && (
                <span className="text-slate-400 ml-1">
                  ({firstJob.start}–{firstJob.end ?? 'present'})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Resume activity */}
        {c.resumeLastActive && (
          <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
            <Clock size={14} className="shrink-0" />
            <span>Active {c.resumeLastActive}</span>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skills.slice(0, 6).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                {s}
              </span>
            ))}
            {skills.length > 6 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-xs">
                +{skills.length - 6}
              </span>
            )}
          </div>
        )}

        {/* Flags */}
        {flags.length > 0 && (
          <div className="flex flex-col gap-1">
            {flags.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700">
                <AlertTriangle size={11} />
                {f}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Grid variant
  return (
    <div
      className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-slate-900">{c.name ?? 'Unknown'}</h3>
          {c.location && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {c.location}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <ScoreChip label="M" value={c.matchScore} size="sm" />
          <ScoreChip label="W" value={c.willingScore} size="sm" />
        </div>
      </div>
      {c.aiSummary && (
        <p className="text-xs text-slate-600 line-clamp-2 italic">"{c.aiSummary}"</p>
      )}
      {firstJob && (
        <p className="text-xs text-slate-500 mt-1">
          {firstJob.role} @ {firstJob.employer}
        </p>
      )}
      {flags.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
          <AlertTriangle size={11} />
          {flags[0]}
          {flags.length > 1 && ` +${flags.length - 1}`}
        </div>
      )}
    </div>
  )
}
