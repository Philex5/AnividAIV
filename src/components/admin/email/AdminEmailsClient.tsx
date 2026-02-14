"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface AdminEmailsCopy {
  title: string;
  subtitle: string;
  tabs: {
    sent: string;
    manual: string;
  };
  sent: {
    searchPlaceholder: string;
    statusPlaceholder: string;
    allStatus: string;
    refresh: string;
    noData: string;
    columns: {
      subject: string;
      recipient: string;
      campaign: string;
      status: string;
      sentAt: string;
      action: string;
    };
    detail: string;
    pagination: {
      prev: string;
      next: string;
      page: string;
    };
    syncFromResend: string;
    syncingFromResend: string;
    syncResultTemplate: string;
  };
  manual: {
    targetLabel: string;
    targetAll: string;
    targetSpecific: string;
    recipientsLabel: string;
    recipientsPlaceholder: string;
    campaignNameLabel: string;
    campaignNamePlaceholder: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    contentTextLabel: string;
    contentTextPlaceholder: string;
    preview: string;
    previewing: string;
    submit: string;
    sending: string;
    resultTitle: string;
    resultTemplate: string;
  };
  detailDialog: {
    title: string;
    campaign: string;
    recipient: string;
    status: string;
    resendMessageId: string;
    error: string;
    sentAt: string;
    html: string;
    text: string;
    metadata: string;
  };
  messages: {
    loading: string;
    loadFailed: string;
    sendSuccess: string;
    sendFailed: string;
    invalidForm: string;
    syncFailed: string;
    previewFailed: string;
  };
}

interface EmailLogItem {
  uuid: string;
  email: string;
  campaign_uuid: string | null;
  campaign_name: string | null;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function AdminEmailsClient({ copy }: { copy: AdminEmailsCopy }) {
  const [activeTab, setActiveTab] = useState("sent");

  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);

  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [campaignName, setCampaignName] = useState("");
  const [specificEmails, setSpecificEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [contentText, setContentText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");

  const statusOptions = useMemo(
    () => [
      "pending",
      "sent",
      "delivered",
      "opened",
      "clicked",
      "failed",
      "bounced",
      "complained",
    ],
    []
  );

  async function fetchLogs(nextPage = pagination.page) {
    try {
      setLoadingLogs(true);
      setLogsError(null);

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(pagination.limit),
      });

      if (search.trim()) {
        params.set("q", search.trim());
      }

      if (status !== "all") {
        params.set("status", status);
      }

      const response = await fetch(`/api/admin/emails/logs?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || result?.code !== 0) {
        throw new Error(result?.message || copy.messages.loadFailed);
      }

      setLogs(result.data.items || []);
      setPagination(result.data.pagination || pagination);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.messages.loadFailed;
      setLogsError(message);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    if (activeTab === "sent") {
      fetchLogs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function handleViewDetail(uuid: string) {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      setDetailData(null);

      const response = await fetch(`/api/admin/emails/logs/${uuid}`);
      const result = await response.json();

      if (!response.ok || result?.code !== 0) {
        throw new Error(result?.message || copy.messages.loadFailed);
      }

      setDetailData(result.data.item || null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.messages.loadFailed;
      setDetailError(message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSendManual() {
    try {
      if (!subject.trim() || !contentText.trim()) {
        setSendResult(copy.messages.invalidForm);
        return;
      }

      if (targetType === "specific" && !specificEmails.trim()) {
        setSendResult(copy.messages.invalidForm);
        return;
      }

      setSending(true);
      setSendResult("");

      const response = await fetch("/api/admin/emails/send-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetType,
          campaignName,
          specificEmails,
          subject,
          contentText,
        }),
      });

      const result = await response.json();

      if (!response.ok || result?.code !== 0) {
        throw new Error(result?.message || copy.messages.sendFailed);
      }

      const summary = copy.manual.resultTemplate
        .replace("{total}", String(result.data.total || 0))
        .replace("{success}", String(result.data.success || 0))
        .replace("{failed}", String(result.data.failed_count || 0));

      setSendResult(`${copy.messages.sendSuccess}: ${summary}`);
      setActiveTab("sent");
      await fetchLogs(1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.messages.sendFailed;
      setSendResult(`${copy.messages.sendFailed}: ${message}`);
    } finally {
      setSending(false);
    }
  }

  async function handleSyncFromResend() {
    try {
      setSyncing(true);
      setSyncResult("");

      const response = await fetch("/api/admin/emails/sync-resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuids: logs.map((item) => item.uuid),
        }),
      });

      const result = await response.json();

      if (!response.ok || result?.code !== 0) {
        throw new Error(result?.message || copy.messages.syncFailed);
      }

      const summary = copy.sent.syncResultTemplate
        .replace("{total}", String(result.data.total || 0))
        .replace("{synced}", String(result.data.synced || 0))
        .replace("{changed}", String(result.data.changed || 0))
        .replace("{failed}", String((result.data.failed || []).length || 0));

      setSyncResult(summary);
      await fetchLogs(pagination.page);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.messages.syncFailed;
      setSyncResult(`${copy.messages.syncFailed}: ${message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handlePreviewManual() {
    try {
      if (!subject.trim() || !contentText.trim()) {
        setSendResult(copy.messages.invalidForm);
        return;
      }

      setPreviewOpen(true);
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewHtml("");

      const response = await fetch("/api/admin/emails/preview-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          contentText,
        }),
      });

      const result = await response.json();
      if (!response.ok || result?.code !== 0) {
        throw new Error(result?.message || copy.messages.previewFailed);
      }

      setPreviewHtml(result?.data?.html || "");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.messages.previewFailed;
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sent">{copy.tabs.sent}</TabsTrigger>
          <TabsTrigger value="manual">{copy.tabs.manual}</TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.sent.searchPlaceholder}
              className="max-w-xs"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={copy.sent.statusPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.sent.allStatus}</SelectItem>
                {statusOptions.map((item) => (
                  <SelectItem value={item} key={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => fetchLogs(1)}>{copy.sent.refresh}</Button>
            <Button variant="outline" onClick={handleSyncFromResend} disabled={syncing}>
              {syncing ? copy.sent.syncingFromResend : copy.sent.syncFromResend}
            </Button>
          </div>
          {syncResult ? <div className="text-sm text-muted-foreground">{syncResult}</div> : null}

          {loadingLogs ? (
            <div className="text-sm text-muted-foreground">{copy.messages.loading}</div>
          ) : logsError ? (
            <div className="text-sm text-destructive">{logsError}</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-muted-foreground">{copy.sent.noData}</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.sent.columns.subject}</TableHead>
                      <TableHead>{copy.sent.columns.recipient}</TableHead>
                      <TableHead>{copy.sent.columns.campaign}</TableHead>
                      <TableHead>{copy.sent.columns.status}</TableHead>
                      <TableHead>{copy.sent.columns.sentAt}</TableHead>
                      <TableHead>{copy.sent.columns.action}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((item) => (
                      <TableRow key={item.uuid}>
                        <TableCell className="max-w-[260px] truncate">{item.subject}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{item.email}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{item.campaign_name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === "failed" ? "destructive" : "secondary"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.sent_at || item.created_at)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleViewDetail(item.uuid)}>
                            {copy.sent.detail}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {copy.sent.pagination.page
                    .replace("{page}", String(pagination.page))
                    .replace("{totalPages}", String(pagination.totalPages))
                    .replace("{total}", String(pagination.total))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchLogs(pagination.page - 1)}
                  >
                    {copy.sent.pagination.prev}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchLogs(pagination.page + 1)}
                  >
                    {copy.sent.pagination.next}
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 mt-4">
          <div className="grid gap-4 max-w-3xl">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{copy.manual.targetLabel}</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={targetType === "all" ? "default" : "outline"}
                  onClick={() => setTargetType("all")}
                >
                  {copy.manual.targetAll}
                </Button>
                <Button
                  type="button"
                  variant={targetType === "specific" ? "default" : "outline"}
                  onClick={() => setTargetType("specific")}
                >
                  {copy.manual.targetSpecific}
                </Button>
              </div>
            </div>

            {targetType === "specific" && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">{copy.manual.recipientsLabel}</label>
                <Textarea
                  rows={4}
                  value={specificEmails}
                  onChange={(event) => setSpecificEmails(event.target.value)}
                  placeholder={copy.manual.recipientsPlaceholder}
                />
              </div>
            )}

            <div className="grid gap-2">
              <label className="text-sm font-medium">{copy.manual.campaignNameLabel}</label>
              <Input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder={copy.manual.campaignNamePlaceholder}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">{copy.manual.subjectLabel}</label>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={copy.manual.subjectPlaceholder}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">{copy.manual.contentTextLabel}</label>
              <Textarea
                rows={10}
                value={contentText}
                onChange={(event) => setContentText(event.target.value)}
                placeholder={copy.manual.contentTextPlaceholder}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handlePreviewManual} disabled={sending || previewLoading}>
                {previewLoading ? copy.manual.previewing : copy.manual.preview}
              </Button>
              <Button onClick={handleSendManual} disabled={sending}>
                {sending ? copy.manual.sending : copy.manual.submit}
              </Button>
            </div>

            {sendResult ? (
              <div className="text-sm text-muted-foreground">{sendResult}</div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{copy.detailDialog.title}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="text-sm text-muted-foreground">{copy.messages.loading}</div>
          ) : detailError ? (
            <div className="text-sm text-destructive">{detailError}</div>
          ) : detailData ? (
            <div className="grid gap-3 text-sm">
              <div><strong>{copy.detailDialog.campaign}:</strong> {detailData.campaign_name || "-"}</div>
              <div><strong>{copy.detailDialog.recipient}:</strong> {detailData.email}</div>
              <div><strong>{copy.detailDialog.status}:</strong> {detailData.status}</div>
              <div><strong>{copy.detailDialog.resendMessageId}:</strong> {detailData.resend_message_id || "-"}</div>
              <div><strong>{copy.detailDialog.error}:</strong> {detailData.error_message || "-"}</div>
              <div><strong>{copy.detailDialog.sentAt}:</strong> {formatDate(detailData.sent_at)}</div>
              <div>
                <strong>{copy.detailDialog.html}:</strong>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-muted p-3 text-xs overflow-x-auto">
                  {detailData.html_content || "-"}
                </pre>
              </div>
              <div>
                <strong>{copy.detailDialog.text}:</strong>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-muted p-3 text-xs overflow-x-auto">
                  {detailData.text_content || "-"}
                </pre>
              </div>
              <div>
                <strong>{copy.detailDialog.metadata}:</strong>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-muted p-3 text-xs overflow-x-auto">
                  {detailData.metadata ? JSON.stringify(detailData.metadata, null, 2) : "-"}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{copy.manual.preview}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="text-sm text-muted-foreground">{copy.messages.loading}</div>
          ) : previewError ? (
            <div className="text-sm text-destructive">{previewError}</div>
          ) : (
            <iframe
              title="manual-email-preview"
              srcDoc={previewHtml}
              className="w-full min-h-[560px] rounded-md border bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
