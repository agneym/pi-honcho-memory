import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { beforeEach, describe, expect, it, vi } from "vitest";
import honcho from "../extensions/index.ts";
import { LIFECYCLE_WAIT_TIMEOUT_MS } from "../extensions/lifecycle.ts";

const mocks = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  clearCachedMemory: vi.fn(),
  clearHandles: vi.fn(),
  flushPending: vi.fn(),
  getCachedMemory: vi.fn(),
  getHandles: vi.fn(),
  refreshMemoryCache: vi.fn(),
  resolveConfig: vi.fn(),
  saveMessages: vi.fn(),
}));

vi.mock("../extensions/client.ts", () => ({
  bootstrap: mocks.bootstrap,
  clearHandles: mocks.clearHandles,
  getHandles: mocks.getHandles,
}));

vi.mock("../extensions/config.ts", () => ({ resolveConfig: mocks.resolveConfig }));

vi.mock("../extensions/memory.ts", () => ({
  clearCachedMemory: mocks.clearCachedMemory,
  flushPending: mocks.flushPending,
  getCachedMemory: mocks.getCachedMemory,
  refreshMemoryCache: mocks.refreshMemoryCache,
  saveMessages: mocks.saveMessages,
}));

type Handler = (event: Record<string, unknown>, ctx: TestContext) => unknown;

interface TestContext {
  cwd: string;
  ui: {
    setStatus: (id: string, text: string) => void;
    theme: { fg: (color: string, text: string) => string };
  };
}

const context: TestContext = {
  cwd: "/tmp/project",
  ui: {
    setStatus: () => {},
    theme: { fg: (_color, text) => text },
  },
};

const createHarness = (): Map<string, Handler> => {
  const handlers = new Map<string, Handler>();
  // Mock implements only APIs used during extension registration.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const pi = {
    on(event: string, handler: Handler) {
      handlers.set(event, handler);
    },
    registerCommand() {},
    registerTool() {},
  } as unknown as ExtensionAPI;

  honcho(pi);
  return handlers;
};

// Intentionally unresolved to exercise deadline and cancellation paths.
// eslint-disable-next-line promise/avoid-new
const never = (): Promise<void> => new Promise(() => {});

const handlerResult = (
  handlers: Map<string, Handler>,
  event: string,
  payload = {},
): Promise<unknown> => {
  const handler = handlers.get(event);
  if (!handler) {
    throw new Error(`Missing ${event} handler`);
  }
  return Promise.resolve(handler(payload, context));
};

describe("bounded lifecycle waits", () => {
  let deadline = new AbortController();
  let timeout = vi.spyOn(AbortSignal, "timeout");

  beforeEach(() => {
    vi.restoreAllMocks();
    deadline = new AbortController();
    timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
    mocks.getCachedMemory.mockReturnValue(null);
    mocks.getHandles.mockReturnValue(null);
    mocks.resolveConfig.mockResolvedValue({ enabled: false });
  });

  it("fails open when initialization exceeds the lifecycle deadline", async () => {
    mocks.resolveConfig.mockResolvedValue({ enabled: true, apiKey: "test" });
    mocks.bootstrap.mockReturnValue(never());
    const handlers = createHarness();

    await handlerResult(handlers, "session_start");
    const beforeAgentStart = handlerResult(handlers, "before_agent_start", {
      systemPrompt: "base",
    });
    deadline.abort();

    await expect(beforeAgentStart).resolves.toBeUndefined();
    expect(timeout).toHaveBeenCalledWith(LIFECYCLE_WAIT_TIMEOUT_MS);
  });

  it.each([
    "session_before_switch",
    "session_before_fork",
    "session_switch",
    "session_fork",
    "session_shutdown",
  ])("fails open when %s persistence exceeds the lifecycle deadline", async (event) => {
    mocks.flushPending.mockReturnValue(never());
    const handlers = createHarness();

    const result = handlerResult(handlers, event);
    deadline.abort();

    await expect(result).resolves.toBeUndefined();
    expect(timeout).toHaveBeenCalledWith(LIFECYCLE_WAIT_TIMEOUT_MS);
  });

  it("stops waiting for pre-compaction persistence when compaction is aborted", async () => {
    mocks.flushPending.mockReturnValue(never());
    const handlers = createHarness();
    const controller = new AbortController();

    const result = handlerResult(handlers, "session_before_compact", { signal: controller.signal });
    controller.abort();

    await expect(result).resolves.toBeUndefined();
    expect(timeout).toHaveBeenCalledWith(LIFECYCLE_WAIT_TIMEOUT_MS);
  });

  it("returns immediately when compaction is already aborted", async () => {
    mocks.flushPending.mockReturnValue(never());
    const handlers = createHarness();
    const controller = new AbortController();
    controller.abort();

    await expect(
      handlerResult(handlers, "session_before_compact", { signal: controller.signal }),
    ).resolves.toBeUndefined();
    expect(timeout).not.toHaveBeenCalled();
  });
});
