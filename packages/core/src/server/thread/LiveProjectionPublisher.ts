
import type { UIMessage } from "ai";
import type { LiveEvent } from "../../types/LiveEvent";
import { chatJobRunRepository } from "../db/repositories/chatJobRunRepository";
import { fingerprintNonTextParts, joinedText } from "./messageText";
import type { LiveBus } from "../live/LiveBus";
import { fingerprintMessage } from "./CheckpointPolicy";

const SNAPSHOT_THROTTLE_MS = 16;

export class LiveProjectionPublisher {
  private lastPublishAt = 0;
  private lastFingerprint: string | null = null;
  private lastNonTextFingerprint: string | null = null;
  private lastPublishedText = "";
  private localSeq = 0;
  private pendingDelta: {
    messageId: string;
    delta: string;
    snapshot: UIMessage;
  } | null = null;
  private pendingSnapshot: UIMessage | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly opts: {
      liveBus: LiveBus;
      userId: string;
      chatId: string;
      runId: string;
    },
  ) {}

  publishRawTextDelta(messageId: string, delta: string): void {
    if (!delta) return;

    if (this.lastPublishedText.length === 0) {
      this.lastNonTextFingerprint = fingerprintNonTextParts({
        id: messageId,
        role: "assistant",
        parts: [],
      });
    }

    this.lastPublishedText += delta;
    this.lastFingerprint = fingerprintMessage({
      id: messageId,
      role: "assistant",
      parts: [{ type: "text", text: this.lastPublishedText }],
    });

    const seq = ++this.localSeq;
    const event: LiveEvent = {
      type: "message.text.delta",
      chatId: this.opts.chatId,
      runId: this.opts.runId,
      seq,
      messageId,
      delta,
    };
    void this.opts.liveBus.publishRunEvent(
      this.opts.userId,
      this.opts.runId,
      event,
    );
    this.lastPublishAt = Date.now();
  }

  publishRawReasoningDelta(messageId: string, delta: string): void {
    if (!delta) return;

    const seq = ++this.localSeq;
    const event: LiveEvent = {
      type: "message.reasoning.delta",
      chatId: this.opts.chatId,
      runId: this.opts.runId,
      seq,
      messageId,
      delta,
    };
    void this.opts.liveBus.publishRunEvent(
      this.opts.userId,
      this.opts.runId,
      event,
    );
    this.lastPublishAt = Date.now();
  }

  maybePublish(snapshot: UIMessage): void {
    const fp = fingerprintMessage(snapshot);
    if (fp === this.lastFingerprint) return;

    const newText = joinedText(snapshot.parts);
    const nonTextFp = fingerprintNonTextParts(snapshot);
    const canDelta =
      this.lastPublishedText.length > 0 &&
      newText.startsWith(this.lastPublishedText) &&
      newText.length > this.lastPublishedText.length &&
      nonTextFp === this.lastNonTextFingerprint;

    if (canDelta) {
      this.pendingSnapshot = null;
      this.pendingDelta = {
        messageId: snapshot.id,
        delta: newText.slice(this.lastPublishedText.length),
        snapshot,
      };
    } else {
      this.pendingDelta = null;
      this.pendingSnapshot = snapshot;
    }

    this.scheduleFlush();
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.flushNow();
    await chatJobRunRepository.setLastPublishedSeq(this.opts.runId, this.localSeq);
  }

  shouldSkipFinalProjection(snapshot: UIMessage): boolean {
    return fingerprintMessage(snapshot) === this.lastFingerprint;
  }

  private scheduleFlush(): void {
    const now = Date.now();
    if (now - this.lastPublishAt >= SNAPSHOT_THROTTLE_MS) {
      void this.flushNow();
      return;
    }
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flushNow();
    }, SNAPSHOT_THROTTLE_MS - (now - this.lastPublishAt));
  }

  private async flushNow(): Promise<void> {
    const delta = this.pendingDelta;
    const snapshot = this.pendingSnapshot;
    if (!delta && !snapshot) return;

    this.pendingDelta = null;
    this.pendingSnapshot = null;

    try {
      if (delta) {
        await this.publishDelta(delta);
        return;
      }
      if (snapshot) {
        await this.publishSnapshot(snapshot);
      }
    } catch (err) {
      console.error("[LiveProjectionPublisher] publish failed", err);
    }
  }

  private async publishDelta(delta: {
    messageId: string;
    delta: string;
    snapshot: UIMessage;
  }): Promise<void> {
    if (!delta.delta) return;

    const seq = ++this.localSeq;
    const event: LiveEvent = {
      type: "message.text.delta",
      chatId: this.opts.chatId,
      runId: this.opts.runId,
      seq,
      messageId: delta.messageId,
      delta: delta.delta,
    };
    void this.opts.liveBus.publishRunEvent(
      this.opts.userId,
      this.opts.runId,
      event,
    );

    this.lastPublishedText = joinedText(delta.snapshot.parts);
    this.lastFingerprint = fingerprintMessage(delta.snapshot);
    this.lastPublishAt = Date.now();
  }

  private async publishSnapshot(snapshot: UIMessage): Promise<void> {
    const fp = fingerprintMessage(snapshot);
    if (fp === this.lastFingerprint) return;

    const seq = ++this.localSeq;
    const event: LiveEvent = {
      type: "thread.projection",
      chatId: this.opts.chatId,
      runId: this.opts.runId,
      seq,
      message: snapshot,
    };
    void this.opts.liveBus.publishRunEvent(
      this.opts.userId,
      this.opts.runId,
      event,
    );

    this.lastFingerprint = fp;
    this.lastNonTextFingerprint = fingerprintNonTextParts(snapshot);
    this.lastPublishedText = joinedText(snapshot.parts);
    this.lastPublishAt = Date.now();
  }
}
