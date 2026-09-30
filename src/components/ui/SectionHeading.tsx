import Link from "next/link";

export function SectionHeading({
  title,
  eyebrow,
  description,
  href,
  linkLabel,
  as: Tag = "h2",
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        {eyebrow && <p className="label-caps text-ink-faint">{eyebrow}</p>}
        <Tag className={`font-serif ${Tag === "h1" ? "text-3xl sm:text-4xl" : "text-2xl"} leading-tight text-ink`}>{title}</Tag>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="text-sm text-accent underline-offset-4 hover:underline">
          {linkLabel ?? "View all"} →
        </Link>
      )}
    </div>
  );
}
