import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getChapterList } from "@/lib/story.functions";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/library")({
  component: Library,
});

function Library() {
  const fn = useServerFn(getChapterList);
  const { data, isLoading } = useQuery({ queryKey: ["chapters"], queryFn: () => fn() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">Every chapter you've unlocked.</p>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && data.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No chapters yet. Head to your dashboard and generate the prologue.
        </Card>
      )}
      {data && data.length > 0 && (
        <Card className="divide-y">
          {data.map((c) => (
            <Link
              key={c.id}
              to="/app/chapters/$id"
              params={{ id: c.id }}
              className="block p-5 hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {c.chapter_type.replace("_", " ")}
                    {!c.read_at && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">NEW</span>}
                  </div>
                  <div className="mt-1 font-medium">{c.title}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
