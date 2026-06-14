"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    api,
    ApiError,
    type ChatConversation,
    type ChatScope,
    type SentimentOverlay,
} from "@/lib/api";
import { dateTime } from "@/lib/format";

const SENTIMENTS: SentimentOverlay[] = ["cautious", "neutral", "aggressive"];

interface ChatPanelProps {
    title: string;
    description?: string;
    placeholder: string;
    historyParams: { scope: ChatScope; isin?: string };
    send: (
        query: string,
        sentiment?: SentimentOverlay,
    ) => Promise<ChatConversation>;
}

export function ChatPanel({
    title,
    description,
    placeholder,
    historyParams,
    send,
}: ChatPanelProps) {
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState("");
    const [sentiment, setSentiment] = useState<SentimentOverlay | null>(null);

    // Scope+isin keyed so the holding panel and the suggestions panel keep
    // independent transcripts.
    const historyKey = ["chat", historyParams.scope, historyParams.isin ?? null];

    const historyQuery = useQuery({
        queryKey: historyKey,
        queryFn: () =>
            api.getChatHistory({
                scope: historyParams.scope,
                isin: historyParams.isin,
                limit: 20,
            }),
    });

    const mutation = useMutation({
        mutationFn: (vars: { query: string; sentiment?: SentimentOverlay }) =>
            send(vars.query, vars.sentiment),
        onSuccess: async () => {
            setDraft("");
            // Synchronous refetch (not invalidate) so the new exchange is on
            // screen before anything else (PROJECT_STATE 14.4 convention).
            await queryClient.refetchQueries({ queryKey: historyKey });
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Chat failed", { description: message });
        },
    });

    const canSend = draft.trim().length > 0 && !mutation.isPending;

    const handleSend = () => {
        if (!canSend) return;
        mutation.mutate({ query: draft.trim(), sentiment: sentiment ?? undefined });
    };

    // API returns newest-first; render oldest-first for a natural transcript.
    const exchanges = historyQuery.data ? [...historyQuery.data].reverse() : [];

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    {title}
                </CardTitle>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Transcript */}
                {historyQuery.isLoading ? (
                    <Skeleton className="h-24" />
                ) : exchanges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No questions yet. Ask anything below.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {exchanges.map((ex) => (
                            <ChatExchange key={ex.id} exchange={ex} />
                        ))}
                    </div>
                )}

                {/* Pending */}
                {mutation.isPending && (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking — fetching fresh data and analysing…
                    </div>
                )}

                {/* Composer */}
                <div className="space-y-2">
                    <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={placeholder}
                        disabled={mutation.isPending}
                        rows={3}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Mood:</span>
                            {SENTIMENTS.map((s) => (
                                <Button
                                    key={s}
                                    type="button"
                                    variant={sentiment === s ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 px-2 text-xs capitalize"
                                    onClick={() =>
                                        setSentiment(sentiment === s ? null : s)
                                    }
                                    disabled={mutation.isPending}
                                >
                                    {s}
                                </Button>
                            ))}
                        </div>
                        <Button
                            onClick={handleSend}
                            disabled={!canSend}
                            size="sm"
                            className="gap-1.5"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Send className="h-3.5 w-3.5" />
                            )}
                            Ask
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        ⌘/Ctrl + Enter to send. Advisory only — never a buy/sell
                        instruction.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function ChatExchange({ exchange }: { exchange: ChatConversation }) {
    return (
        <div className="space-y-2">
            <div className="rounded-md bg-muted/40 px-3 py-2">
                <p className="text-sm font-medium">{exchange.query}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {dateTime(exchange.created_at)}
                    {exchange.sentiment_overlay
                        ? ` · ${exchange.sentiment_overlay}`
                        : ""}
                </p>
            </div>
            <div className="rounded-md border px-3 py-2">
                <MarkdownLite content={exchange.response} />
            </div>
        </div>
    );
}

// ── Minimal markdown renderer ────────────────────────────────────────────────
// The chat answer is markdown (headings, **bold**, bullets, numbered lists, ---).
// The project has no markdown dependency and the house style renders LLM text as
// plain strings, so this self-contained renderer handles the subset Sonnet emits
// without adding a package (keeps deploy a plain `npm run build`).
function renderInline(text: string, keyPrefix: string): ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
        }
        return <span key={`${keyPrefix}-${i}`}>{part}</span>;
    });
}

function MarkdownLite({ content }: { content: string }) {
    const blocks: ReactNode[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    let key = 0;

    const flushList = () => {
        if (!list) return;
        const items = list.items;
        if (list.ordered) {
            blocks.push(
                <ol key={`b-${key++}`} className="ml-5 list-decimal space-y-1">
                    {items.map((it, i) => (
                        <li key={i}>{renderInline(it, `ol-${key}-${i}`)}</li>
                    ))}
                </ol>,
            );
        } else {
            blocks.push(
                <ul key={`b-${key++}`} className="ml-5 list-disc space-y-1">
                    {items.map((it, i) => (
                        <li key={i}>{renderInline(it, `ul-${key}-${i}`)}</li>
                    ))}
                </ul>,
            );
        }
        list = null;
    };

    for (const raw of content.split("\n")) {
        const line = raw.trimEnd();
        if (!line.trim()) {
            flushList();
            continue;
        }
        if (/^---+$/.test(line.trim())) {
            flushList();
            blocks.push(<hr key={`b-${key++}`} className="my-2 border-border" />);
            continue;
        }
        const mH3 = line.match(/^###\s+(.*)$/);
        const mH2 = line.match(/^##\s+(.*)$/);
        const mH1 = line.match(/^#\s+(.*)$/);
        if (mH3) {
            flushList();
            blocks.push(
                <p key={`b-${key++}`} className="mt-1 font-medium">
                    {renderInline(mH3[1], `h3-${key}`)}
                </p>,
            );
            continue;
        }
        if (mH2 || mH1) {
            flushList();
            const txt = mH2 ? mH2[1] : (mH1 as RegExpMatchArray)[1];
            blocks.push(
                <p key={`b-${key++}`} className="mt-1 font-semibold">
                    {renderInline(txt, `h-${key}`)}
                </p>,
            );
            continue;
        }
        const mUl = line.match(/^\s*[-*]\s+(.*)$/);
        const mOl = line.match(/^\s*\d+\.\s+(.*)$/);
        if (mUl) {
            if (!list || list.ordered) {
                flushList();
                list = { ordered: false, items: [] };
            }
            list.items.push(mUl[1]);
            continue;
        }
        if (mOl) {
            if (!list || !list.ordered) {
                flushList();
                list = { ordered: true, items: [] };
            }
            list.items.push(mOl[1]);
            continue;
        }
        flushList();
        blocks.push(<p key={`b-${key++}`}>{renderInline(line, `p-${key}`)}</p>);
    }
    flushList();

    return <div className="space-y-2 text-sm leading-relaxed">{blocks}</div>;
}