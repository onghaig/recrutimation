import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Loader2, ExternalLink } from 'lucide-react'
import { api } from '../api/client'

interface PdfViewerProps {
  candidateId: string
}

export default function PdfViewer({ candidateId }: PdfViewerProps) {
  const [open, setOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['pdf-url', candidateId],
    queryFn: () => api.candidates.pdfUrl(candidateId),
    enabled: open,
    staleTime: 50 * 60 * 1000, // 50 min — presigned URL lasts 1h
  })

  if (!open) {
    return (
      <button
        className="btn-secondary text-xs"
        onClick={() => setOpen(true)}
      >
        <FileText size={14} />
        View Resume PDF
      </button>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={14} className="animate-spin" />
        Loading PDF…
      </div>
    )
  }

  if (error || !data) {
    return (
      <p className="text-xs text-red-500">Failed to load PDF</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary text-xs"
      >
        <ExternalLink size={14} />
        Open PDF in new tab
      </a>
      <iframe
        src={data.url}
        className="w-full rounded-lg border border-slate-200"
        style={{ height: 480 }}
        title="Resume PDF"
      />
    </div>
  )
}
