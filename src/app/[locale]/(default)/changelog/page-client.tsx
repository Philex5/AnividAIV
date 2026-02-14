'use client';

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface ChangelogEntry {
  version: string;
  date: string;
  sections: {
    added?: string[];
    changed?: string[];
    fixed?: string[];
    removed?: string[];
  };
}

function parseChangelog(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = content.split('\n');
  let currentEntry: ChangelogEntry | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const versionMatch = line.match(/^## \[([^\]]+)\]\s+-\s+(\d{4}-\d{2}-\d{2})/);
    if (versionMatch) {
      if (currentEntry) {
        entries.push(currentEntry);
      }

      currentEntry = {
        version: versionMatch[1],
        date: versionMatch[2],
        sections: {},
      };
      continue;
    }

    const sectionMatch = line.match(/^### (\w+)/);
    if (sectionMatch && currentEntry) {
      const sectionName = sectionMatch[1].toLowerCase();
      currentEntry.sections[sectionName as keyof typeof currentEntry.sections] = [];
      continue;
    }

    const itemMatch = line.match(/^- (.+)/);
    if (itemMatch && currentEntry) {
      const sections = Object.keys(currentEntry.sections);
      if (sections.length > 0) {
        const lastSection = sections[sections.length - 1];
        const items = currentEntry.sections[lastSection as keyof typeof currentEntry.sections];
        if (items !== undefined) {
          items.push(itemMatch[1]);
        }
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ChangelogCard({ entry, pageData }: { entry: ChangelogEntry; pageData: any }) {
  const getChangeTypeLabel = (type: string) => {
    return pageData.changeTypes?.[type.toLowerCase()] || type;
  };

  const getBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      added: "default",
      changed: "secondary",
      fixed: "outline",
      removed: "destructive",
    };
    return variants[type.toLowerCase()] || "secondary";
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {pageData.version} {entry.version}
            </h2>
          </div>
          <div className="text-right">
            <CardDescription className="text-base">
              {formatDate(entry.date)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(entry.sections).map(([sectionName, items]) => {
            if (!items || items.length === 0) return null;

            return (
              <div key={sectionName} className="space-y-3">
                <h3 className="text-sm">
                  <Badge variant={getBadgeVariant(sectionName)} className="mr-2">
                    {getChangeTypeLabel(sectionName)}
                  </Badge>
                </h3>
                <ul className="space-y-2 pl-6">
                  {items.map((item, index) => (
                    <li key={index} className="list-disc text-muted-foreground leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChangelogPageClient({ pageData }: { pageData: any }) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChangelog() {
      try {
        const timestamp = new Date().getTime();
        const response = await fetch(`/docs/CHANGELOG.md?v=${timestamp}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch changelog');
        }

        const content = await response.text();
        const parsedEntries = parseChangelog(content);
        setEntries(parsedEntries);
      } catch (error) {
        console.error('Error loading changelog:', error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    loadChangelog();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 lg:py-12 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-muted-foreground">{pageData.loading}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 lg:py-12 max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <p className="text-3xl md:text-4xl font-bold text-foreground">
            {pageData.title}
          </p>
          <p className="text-md text-muted-foreground max-w-2xl mx-auto">
            {pageData.description}
          </p>
        </div>

        <div className="space-y-8">
          {entries.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {pageData.empty}
                </p>
              </CardContent>
            </Card>
          ) : (
            entries.map((entry, index) => (
              <ChangelogCard
                key={index}
                entry={entry}
                pageData={pageData}
              />
            ))
          )}
        </div>

        {pageData.contentGuide?.items?.length ? (
          <section className="mt-10 rounded-xl border border-border bg-card/40 p-5 md:p-6 text-left">
            <h3 className="text-lg font-semibold md:text-xl">{pageData.contentGuide.heading}</h3>
            <ul className="mt-4 space-y-2">
              {pageData.contentGuide.items.map((item: string, index: number) => (
                <li key={`${item}-${index}`} className="list-disc ml-5 text-sm text-muted-foreground leading-7">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
