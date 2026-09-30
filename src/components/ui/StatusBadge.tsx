import type { Tone } from "@/lib/labels";
import {
  CONDUCT_STATUS,
  CORRECTION_STATUS,
  EVIDENCE_STATUS,
  INTEGRITY_STATUS,
  REVIEW_STATUS,
  RISK_FLAG,
  SOURCE_TIER,
  UPDATE_TYPE,
} from "@/lib/labels";
import type {
  ConductStatus,
  CorrectionStatus,
  DailyUpdateType,
  EvidenceStatus,
  IntegrityStatus,
  ReviewStatus,
  RiskFlag,
  SourceTier,
} from "@/lib/types";

export const TONE: Record<Tone, { badge: string; dot: string; text: string; ring: string }> = {
  green: { badge: "bg-status-green-bg text-status-green", dot: "bg-status-green", text: "text-status-green", ring: "border-status-green/40" },
  "green-soft": { badge: "bg-status-green-soft-bg text-status-green-soft", dot: "bg-status-green-soft", text: "text-status-green-soft", ring: "border-status-green-soft/40" },
  amber: { badge: "bg-status-amber-bg text-status-amber", dot: "bg-status-amber", text: "text-status-amber", ring: "border-status-amber/40" },
  red: { badge: "bg-status-red-bg text-status-red", dot: "bg-status-red", text: "text-status-red", ring: "border-status-red/40" },
  grey: { badge: "bg-status-grey-bg text-status-grey", dot: "bg-status-grey", text: "text-status-grey", ring: "border-status-grey/40" },
  slate: { badge: "bg-status-slate-bg text-status-slate", dot: "bg-status-slate", text: "text-status-slate", ring: "border-status-slate/40" },
  blue: { badge: "bg-status-blue-bg text-status-blue", dot: "bg-status-blue", text: "text-status-blue", ring: "border-status-blue/40" },
};

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "px-1.5 py-0.5 text-[0.6875rem]",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-sm",
};

export interface StatusBadgeProps {
  label: string;
  tone: Tone;
  size?: Size;
  title?: string;
  className?: string;
  /** Renders as an outlined, uppercase label. Used for the most important statuses. */
  prominent?: boolean;
}

export function StatusBadge({ label, tone, size = "md", title, className = "", prominent = false }: StatusBadgeProps) {
  const t = TONE[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded font-semibold leading-tight ${SIZE[size]} ${t.badge} ${
        prominent ? `border ${t.ring} uppercase tracking-wide` : ""
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function EvidenceBadge({ status, size, short = false }: { status: EvidenceStatus; size?: Size; short?: boolean }) {
  const meta = EVIDENCE_STATUS[status];
  return <StatusBadge label={short ? meta.short : meta.label} tone={meta.tone} size={size} title={meta.description} />;
}

export function CorrectionBadge({ status, size }: { status: CorrectionStatus; size?: Size }) {
  const meta = CORRECTION_STATUS[status];
  return <StatusBadge label={meta.label} tone={meta.tone} size={size} title={meta.description} />;
}

export function IntegrityBadge({ status, size, prominent }: { status: IntegrityStatus; size?: Size; prominent?: boolean }) {
  const meta = INTEGRITY_STATUS[status];
  return <StatusBadge label={meta.label} tone={meta.tone} size={size} title={meta.description} prominent={prominent} />;
}

export function ConductBadge({ status, size, prominent }: { status: ConductStatus; size?: Size; prominent?: boolean }) {
  const meta = CONDUCT_STATUS[status];
  return <StatusBadge label={meta.label} tone={meta.tone} size={size} title={meta.description} prominent={prominent} />;
}

export function UpdateTypeBadge({ type, size = "sm" }: { type: DailyUpdateType; size?: Size }) {
  const meta = UPDATE_TYPE[type];
  return <StatusBadge label={meta.label} tone={meta.tone} size={size} prominent />;
}

export function ReviewStatusBadge({ status, size }: { status: ReviewStatus; size?: Size }) {
  const meta = REVIEW_STATUS[status];
  return <StatusBadge label={meta.label} tone={meta.tone} size={size} />;
}

export function RiskFlagBadge({ flag, size = "sm" }: { flag: RiskFlag; size?: Size }) {
  const meta = RISK_FLAG[flag];
  return <StatusBadge label={meta.label} tone={meta.tone} size={size} title={meta.description} />;
}

export function TierBadge({ tier, size = "sm" }: { tier: SourceTier; size?: Size }) {
  const meta = SOURCE_TIER[tier];
  const tone: Tone = tier === 1 ? "blue" : tier === 2 ? "slate" : "grey";
  return <StatusBadge label={`Tier ${tier} · ${meta.short}`} tone={tone} size={size} title={meta.description} />;
}
