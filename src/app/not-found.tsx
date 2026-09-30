import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="py-20 text-center" narrow>
      <p className="label-caps text-ink-faint">404</p>
      <h1 className="mt-2 font-serif text-3xl">No record at this address.</h1>
      <p className="mt-3 text-sm text-ink-muted">Records are never deleted, but this address does not match one. Try the search or the politician directory.</p>
      <p className="mt-6 flex justify-center gap-4 text-sm">
        <Link href="/search" className="text-accent underline underline-offset-4">
          Search
        </Link>
        <Link href="/politicians" className="text-accent underline underline-offset-4">
          Politicians
        </Link>
      </p>
    </Container>
  );
}
