import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getChapter } from "@/lib/story.functions";

export const Route = createFileRoute("/_authenticated/chapters/$id")({
  component: ChapterView,
});

function ChapterView() {
  const { id } = Route.useParams();
  const fn = useServerFn(getChapter);
  const { data, isLoading, error } = useQuery({
    queryKey: ["chapter", id],
    queryFn: () => fn({ data: { id } }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load chapter.</p>;
  if (!data) return null;

  return (
    <article className="mx-auto max-w-2xl">
      <Link to="/library" className="text-sm text-muted-foreground hover:underline">← Library</Link>
      <div className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">
        {data.chapter_type.replace("_", " ")} · {new Date(data.created_at).toLocaleDateString()}
      </div>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">{data.title}</h1>
      <div className="prose prose-lg mt-8 max-w-none whitespace-pre-wrap leading-relaxed text-foreground">
        {data.content}
      </div>
    </article>
  );
}
