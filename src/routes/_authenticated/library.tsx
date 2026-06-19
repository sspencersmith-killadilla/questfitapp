import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getChapterList } from "@/lib/story.functions";
import { getChallengeHistory } from "@/lib/challenges.functions";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/library")({
  component: Library,
});

const METRIC_LABEL: Record<string, string> = {
  active_minutes: "active min",
  steps: "steps",
  workouts: "workouts",
};

function Library() {
  const chaptersFn = useServerFn(getChapterList);
  const challengesFn = useServerFn(getChallengeHistory);
  const { data: chapters, isLoading } = useQuery({
    queryKey: ["chapters"],
    queryFn: () => chaptersFn(),
  });
  const { data: challenges } = useQuery({
    queryKey: ["challenges-history"],
    queryFn: () => challengesFn(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">Everything your story has unlocked so far.</p>
      </div>

      <Tabs defaultValue="chapters">
        <TabsList>
          <TabsTrigger value="chapters">Chapters</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
        </TabsList>

        <TabsContent value="chapters" className="mt-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {chapters && chapters.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No chapters yet. Head to your dashboard and generate the prologue.
            </Card>
          )}
          {chapters && chapters.length > 0 && (
            <Card className="divide-y">
              {chapters.map((c: any) => {
                const snap = c.activity_snapshot ?? {};
                const meta =
                  typeof snap === "object" && snap.total_active_minutes !== undefined
                    ? `Born from: ${snap.workouts?.length ?? 0} workouts · ${snap.total_active_minutes} min`
                    : null;
                return (
                  <Link
                    key={c.id}
                    to="/chapters/$id"
                    params={{ id: c.id }}
                    className="block p-5 hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          {c.chapter_type.replace("_", " ")}
                          {!c.read_at && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-medium">{c.title}</div>
                        {meta && <div className="mt-1 text-xs text-muted-foreground">{meta}</div>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="mt-4">
          {(!challenges || challenges.length === 0) && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No challenges yet. Trigger one from the dashboard.
            </Card>
          )}
          {challenges && challenges.length > 0 && (
            <Card className="divide-y">
              {challenges.map((ch: any) => (
                <div key={ch.id} className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {ch.status}
                      </div>
                      <div className="mt-1 font-medium">{ch.title}</div>
                      <div className="mt-1 text-xs italic text-muted-foreground">
                        "{ch.narrative_hook}"
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>
                        {ch.progress_value} / {ch.target_value}{" "}
                        {METRIC_LABEL[ch.metric] ?? ch.metric}
                      </div>
                      <div>
                        {new Date(ch.starts_on).toLocaleDateString()} →{" "}
                        {new Date(ch.deadline).toLocaleDateString()}
                      </div>
                      {ch.resolution_chapter_id && (
                        <Link
                          to="/chapters/$id"
                          params={{ id: ch.resolution_chapter_id }}
                          className="mt-1 inline-block text-primary hover:underline"
                        >
                          Read payoff →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
