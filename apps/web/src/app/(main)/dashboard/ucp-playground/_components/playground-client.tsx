// "use client";

// import { readStreamableValue } from "@ai-sdk/rsc";
// import { cn } from "@zenncore/utils";
// import { useAsyncAction } from "@zenncore/utils/hooks";
// import { Button } from "@zenncore/web/components/button";
// import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
// import {
//   type Dispatch,
//   type SetStateAction,
//   useEffect,
//   useRef,
//   useState,
// } from "react";
// import { runPlayground } from "@/server/app/intelligence/ucp-playground";
// import { StatusPill } from "../../_components/grid";

// // ─── Types ───────────────────────────────────────────────────────────────────

// type LogLine =
//   | {
//       kind: "profile";
//       transport: string;
//       endpoint: string;
//       profileUrl: string;
//       agentProfileUrl: string;
//     }
//   | { kind: "text"; text: string }
//   | { kind: "tool_call"; id: string; tool: string; args: unknown }
//   | { kind: "tool_result"; id: string; tool: string; result: unknown }
//   | { kind: "error"; message: string }
//   | { kind: "done" };

// // ─── JSON collapse util ───────────────────────────────────────────────────────

// const summarise = (value: unknown, maxLen = 160): string => {
//   if (value === null || value === undefined) return "null";
//   const raw = JSON.stringify(value);
//   if (raw.length <= maxLen) return raw;
//   return `${raw.slice(0, maxLen)}…`;
// };

// // ─── Log line renderers ───────────────────────────────────────────────────────

// const ProfileLine = ({
//   line,
// }: {
//   line: Extract<LogLine, { kind: "profile" }>;
// }) => (
//   <div className="flex flex-col gap-1">
//     <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
//       <span className="font-medium text-primary">Profile resolved</span>
//       <span
//         className={cn(
//           "rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.05em]",
//           line.transport === "mcp"
//             ? "bg-primary/10 text-primary"
//             : "bg-warning/10 text-warning",
//         )}
//       >
//         {line.transport}
//       </span>
//       <span className="font-mono text-foreground-dimmed/70 text-xs">
//         {line.endpoint}
//       </span>
//     </div>
//     <div className="font-mono text-foreground-dimmed/60 text-xs">
//       Agent profile: {line.agentProfileUrl}
//     </div>
//     <span className="font-mono text-foreground-dimmed/60 text-xs">
//       Store profile: {line.profileUrl}
//     </span>
//   </div>
// );

// const ToolCallLine = ({
//   line,
// }: {
//   line: Extract<LogLine, { kind: "tool_call" }>;
// }) => (
//   <div className="flex flex-col gap-0.5">
//     <div className="flex items-center gap-2">
//       <span className="text-foreground-dimmed/50">▶</span>
//       <span className="font-mono font-semibold text-sm text-warning">
//         {line.tool}
//       </span>
//       <span className="font-mono text-foreground-dimmed/60 text-xs">
//         {summarise(line.args)}
//       </span>
//     </div>
//   </div>
// );

// const ToolResultLine = ({
//   line,
// }: {
//   line: Extract<LogLine, { kind: "tool_result" }>;
// }) => (
//   <div className="ml-4 flex items-start gap-2 border-foreground-dimmed/10 border-l-2 pl-3">
//     <span className="mt-0.5 shrink-0 text-foreground-dimmed/40">└</span>
//     <span className="font-mono text-foreground-dimmed/70 text-xs leading-relaxed">
//       {summarise(line.result)}
//     </span>
//   </div>
// );

// const TextSegment = ({ text }: { text: string }) => (
//   <span className="font-mono text-foreground/80 text-xs">{text}</span>
// );

// const ErrorLine = ({ message }: { message: string }) => (
//   <div className="flex items-start gap-2 text-error">
//     <span className="shrink-0">✕</span>
//     <span className="font-mono text-xs">{message}</span>
//   </div>
// );

// const DoneLine = () => (
//   <div className="flex items-center gap-2 border-accent-foreground/30 border-t pt-2 text-success">
//     <span>✓</span>
//     <span className="font-mono text-xs">Run complete</span>
//   </div>
// );

// // ─── Main component ───────────────────────────────────────────────────────────

// export const PlaygroundClient = () => {
//   const [storeUrl, setStoreUrl] = useState("");
//   const [query, setQuery] = useState("");

//   const [lines, setLines] = useState<LogLine[]>([]);
//   const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(
//     "idle",
//   );
//   const logRef = useRef<HTMLDivElement>(null);

//   // auto-scroll
//   useEffect(() => {
//     if (logRef.current) {
//       logRef.current.scrollTop = logRef.current.scrollHeight;
//     }
//   });

//   const flushText = (
//     buffer: string,
//     setter: Dispatch<SetStateAction<LogLine[]>>,
//   ) => {
//     if (!buffer) return;
//     setter((prev) => {
//       const last = prev[prev.length - 1];
//       if (last?.kind === "text") {
//         return [
//           ...prev.slice(0, -1),
//           { kind: "text", text: last.text + buffer } as LogLine,
//         ];
//       }
//       return [...prev, { kind: "text", text: buffer } as LogLine];
//     });
//   };

//   const [handleRun, isRunning] = useAsyncAction(async () => {
//     if (!storeUrl.trim()) return;

//     setLines([]);
//     setPhase("running");

//     const { stream } = await runPlayground({
//       storeUrl: storeUrl.trim(),
//       query: query.trim() || undefined,
//       agentProfileUrl: "https://ecentic.ai/ucp/agent-profile",
//     });

//     let localBuffer = "";

//     for await (const event of readStreamableValue(stream)) {
//       if (!event) continue;

//       switch (event.kind) {
//         case "text": {
//           localBuffer += event.text;
//           // flush on sentence boundaries to reduce re-renders
//           if (/[.\n]/.test(event.text)) {
//             const captured = localBuffer;
//             localBuffer = "";
//             setLines((prev) => {
//               const last = prev[prev.length - 1];
//               if (last?.kind === "text") {
//                 return [
//                   ...prev.slice(0, -1),
//                   { kind: "text", text: last.text + captured } as LogLine,
//                 ];
//               }
//               return [...prev, { kind: "text", text: captured } as LogLine];
//             });
//           }
//           break;
//         }
//         case "tool_call":
//         case "tool_result":
//         case "profile": {
//           // flush any pending text first
//           if (localBuffer) {
//             const captured = localBuffer;
//             localBuffer = "";
//             setLines((prev) => {
//               const last = prev[prev.length - 1];
//               if (last?.kind === "text") {
//                 return [
//                   ...prev.slice(0, -1),
//                   { kind: "text", text: last.text + captured } as LogLine,
//                 ];
//               }
//               return [...prev, { kind: "text", text: captured } as LogLine];
//             });
//           }
//           setLines((prev) => [...prev, event as LogLine]);
//           break;
//         }
//         case "error": {
//           if (localBuffer) {
//             const captured = localBuffer;
//             localBuffer = "";
//             flushText(captured, setLines);
//           }
//           setLines((prev) => [...prev, event as LogLine]);
//           setPhase("error");
//           break;
//         }
//         case "done": {
//           if (localBuffer) {
//             const captured = localBuffer;
//             localBuffer = "";
//             setLines((prev) => {
//               const last = prev[prev.length - 1];
//               if (last?.kind === "text") {
//                 return [
//                   ...prev.slice(0, -1),
//                   { kind: "text", text: last.text + captured } as LogLine,
//                 ];
//               }
//               return [...prev, { kind: "text", text: captured } as LogLine];
//             });
//           }
//           setLines((prev) => [...prev, { kind: "done" } as LogLine]);
//           setPhase("done");
//           break;
//         }
//       }
//     }

//     // flush any remaining buffer
//     if (localBuffer) {
//       flushText(localBuffer, setLines);
//     }
//   });

//   const isEmpty = lines.length === 0 && phase === "idle";

//   return (
//     <div className="space-y-4">
//       {/* Input panel */}
//       <div className="rounded-lg border border-accent-foreground bg-background-rich">
//         <div className="border-accent-foreground border-b px-4 py-2.5">
//           <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
//             Store endpoint
//           </p>
//           <p className="mt-1 text-foreground-dimmed text-xs">
//             Enter the base URL of a UCP-compliant store. A{" "}
//             <span className="font-mono">/.well-known/ucp</span> profile will be
//             resolved automatically to detect MCP or REST transport.
//           </p>
//         </div>
//         <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
//           <TextField
//             value={storeUrl}
//             onValueChange={setStoreUrl}
//             className="h-8 flex-1 border border-accent-foreground bg-background-dimmed"
//           >
//             <TextFieldInput
//               placeholder="https://store.example.com"
//               className="px-3 font-mono text-sm"
//             />
//           </TextField>
//           <TextField
//             value={query}
//             onValueChange={setQuery}
//             className="h-8 w-full border border-accent-foreground bg-background-dimmed sm:w-48"
//           >
//             <TextFieldInput
//               placeholder='Search query (e.g. "coffee")'
//               className="px-3 text-sm"
//             />
//           </TextField>
//           <Button
//             color="primary"
//             onClick={handleRun}
//             disabled={isRunning || !storeUrl.trim()}
//             className="shrink-0 px-5 py-1.5 text-sm"
//           >
//             {isRunning ? (
//               <span className="flex items-center gap-2">
//                 <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
//                 Running…
//               </span>
//             ) : (
//               "Run"
//             )}
//           </Button>
//         </div>
//         <div className="border-accent-foreground border-t px-4 py-3">
//           <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
//             Agent profile fixture
//           </p>
//           <p className="mt-1 text-foreground-dimmed text-xs">
//             Used as <span className="font-mono">meta.ucp-agent.profile</span> in
//             tool calls to test negotiation outcomes.
//           </p>
//         </div>
//       </div>

//       {/* Terminal output */}
//       <div className="rounded-lg border border-accent-foreground bg-background-rich">
//         <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-2.5">
//           <div className="flex items-center gap-2">
//             <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
//               Output
//             </p>
//             {phase === "running" && (
//               <StatusPill tone="primary">Live</StatusPill>
//             )}
//             {phase === "done" && <StatusPill tone="success">Done</StatusPill>}
//             {phase === "error" && <StatusPill tone="error">Error</StatusPill>}
//           </div>
//           {!isEmpty && (
//             <button
//               type="button"
//               onClick={() => {
//                 setLines([]);
//                 setPhase("idle");
//               }}
//               className="font-medium text-foreground-dimmed text-xs hover:text-foreground"
//             >
//               Clear
//             </button>
//           )}
//         </div>

//         <div
//           ref={logRef}
//           className="m-4 max-h-[520px] min-h-40 overflow-y-auto rounded-md bg-background-dimmed p-4 font-mono text-xs"
//         >
//           {isEmpty ? (
//             <p className="font-light text-foreground-dimmed/50 text-xs">
//               Enter a store URL above and press{" "}
//               <span className="font-medium text-foreground-dimmed">Run</span> to
//               start the UCP flow test.
//             </p>
//           ) : (
//             <div className="space-y-2">
//               {lines.map((line, index) => {
//                 const key = index;
//                 switch (line.kind) {
//                   case "profile":
//                     return <ProfileLine key={key} line={line} />;
//                   case "tool_call":
//                     return <ToolCallLine key={key} line={line} />;
//                   case "tool_result":
//                     return <ToolResultLine key={key} line={line} />;
//                   case "text":
//                     return <TextSegment key={key} text={line.text} />;
//                   case "error":
//                     return <ErrorLine key={key} message={line.message} />;
//                   case "done":
//                     return <DoneLine key={key} />;
//                   default:
//                     return null;
//                 }
//               })}
//               {isRunning && phase !== "done" && phase !== "error" && (
//                 <span className="inline-block h-3 w-1.5 animate-pulse bg-primary/60" />
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Session results */}
//       <CheckoutResult lines={lines} />
//       <CartResult lines={lines} />
//     </div>
//   );
// };

// // ─── Checkout result panel ────────────────────────────────────────────────────

// const checkoutTools = new Set([
//   "create_checkout",
//   "get_checkout",
//   "update_checkout",
//   "complete_checkout",
// ]);

// const CheckoutResult = ({ lines }: { lines: LogLine[] }) => {
//   const checkoutResult = [...lines]
//     .reverse()
//     .find(
//       (line): line is Extract<LogLine, { kind: "tool_result" }> =>
//         line.kind === "tool_result" && checkoutTools.has(line.tool),
//     );

//   if (!checkoutResult) return null;

//   const raw = checkoutResult.result;
//   if (!raw || typeof raw !== "object" || "error" in raw) return null;

//   const checkout = raw as Record<string, unknown>;
//   const status =
//     typeof checkout["status"] === "string" ? checkout["status"] : null;
//   const continueUrl =
//     typeof checkout["continue_url"] === "string"
//       ? checkout["continue_url"]
//       : null;
//   const checkoutId =
//     typeof checkout["id"] === "string" ? checkout["id"] : null;

//   return (
//     <div className="rounded-lg border border-accent-foreground bg-background-rich">
//       <div className="border-accent-foreground border-b px-4 py-2.5">
//         <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
//           Checkout session
//         </p>
//         <p className="mt-1 text-foreground-dimmed text-xs">
//           Last <span className="font-mono">{checkoutResult.tool}</span> response
//         </p>
//       </div>
//       <div className="space-y-3 p-4">
//         {status && (
//           <div className="flex flex-wrap items-center gap-2">
//             <span className="font-medium text-foreground text-sm">Status</span>
//             <StatusPill
//               tone={
//                 status === "completed"
//                   ? "success"
//                   : status === "requires_escalation" ||
//                       status === "incomplete"
//                     ? "warning"
//                     : status === "canceled"
//                       ? "error"
//                       : "primary"
//               }
//             >
//               {status}
//             </StatusPill>
//           </div>
//         )}
//         {checkoutId && (
//           <p className="break-all font-mono text-foreground-dimmed text-xs">
//             {checkoutId}
//           </p>
//         )}
//         {continueUrl && (
//           <a
//             href={continueUrl}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="inline-block font-mono text-primary text-xs underline underline-offset-2"
//           >
//             {continueUrl}
//           </a>
//         )}
//         <pre className="max-h-72 overflow-auto rounded-md bg-background-dimmed p-4 font-mono text-foreground/80 text-xs leading-relaxed">
//           {JSON.stringify(raw, null, 2)}
//         </pre>
//       </div>
//     </div>
//   );
// };

// // ─── Cart result panel ────────────────────────────────────────────────────────

// const CartResult = ({ lines }: { lines: LogLine[] }) => {
//   const cartResult = [...lines]
//     .reverse()
//     .find(
//       (l): l is Extract<LogLine, { kind: "tool_result" }> =>
//         l.kind === "tool_result" && l.tool === "get_cart",
//     );

//   if (!cartResult) return null;

//   const raw = cartResult.result;
//   const json = JSON.stringify(raw, null, 2);

//   return (
//     <div className="rounded-lg border border-accent-foreground bg-background-rich">
//       <div className="border-accent-foreground border-b px-4 py-2.5">
//         <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
//           Cart state
//         </p>
//         <p className="mt-1 text-foreground-dimmed text-xs">
//           Last <span className="font-mono">get_cart</span> response
//         </p>
//       </div>
//       <pre className="m-4 max-h-72 overflow-auto rounded-md bg-background-dimmed p-4 font-mono text-foreground/80 text-xs leading-relaxed">
//         {json}
//       </pre>
//     </div>
//   );
// };

"use client";


import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/ai/conversation";
import {
  Message,
  MessageBranch,
  MessageBranchContent,
  MessageContent,
  MessageResponse,
} from "@/components/ui/ai/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ui/ai/model-selector";
import type { PromptInputMessage } from "@/components/ui/ai/prompt-input";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ui/ai/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ui/ai/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ui/ai/sources";
import { Suggestion, Suggestions } from "@/components/ui/ai/suggestion";
import type { ToolUIPart } from "ai";
import { CheckIcon } from "@zenncore/icons";
import { useCallback, useMemo, useState } from "react";
import { useToastManager } from "@zenncore/web/components/toast";

interface MessageType {
  key: string;
  from: "user" | "assistant";
  sources?: { href: string; title: string }[];
  versions: {
    id: string;
    content: string;
  }[];
  reasoning?: {
    content: string;
    duration: number;
  };
  tools?: {
    name: string;
    description: string;
    status: ToolUIPart["state"];
    parameters: Record<string, unknown>;
    result: string | undefined;
    error: string | undefined;
  }[];
}

const initialMessages = [
  {
    from: "user",
    key: crypto.randomUUID(),
    versions: [
      {
        content: "Can you explain how to use React hooks effectively?",
        id: crypto.randomUUID(),
      },
    ],
  },
  {
    from: "assistant",
    key: crypto.randomUUID(),
    sources: [
      {
        href: "https://react.dev/reference/react",
        title: "React Documentation",
      },
      {
        href: "https://react.dev/reference/react-dom",
        title: "React DOM Documentation",
      },
    ],
    tools: [
      {
        description: "Searching React documentation",
        error: undefined,
        name: "mcp",
        parameters: {
          query: "React hooks best practices",
          source: "react.dev",
        },
        result: `{
  "query": "React hooks best practices",
  "results": [
    {
      "title": "Rules of Hooks",
      "url": "https://react.dev/warnings/invalid-hook-call-warning",
      "snippet": "Hooks must be called at the top level of your React function components or custom hooks. Don't call hooks inside loops, conditions, or nested functions."
    },
    {
      "title": "useState Hook",
      "url": "https://react.dev/reference/react/useState",
      "snippet": "useState is a React Hook that lets you add state to your function components. It returns an array with two values: the current state and a function to update it."
    },
    {
      "title": "useEffect Hook",
      "url": "https://react.dev/reference/react/useEffect",
      "snippet": "useEffect lets you synchronize a component with external systems. It runs after render and can be used to perform side effects like data fetching."
    }
  ]
}`,
        status: "input-available",
      },
    ],
    versions: [
      {
        content: `# React Hooks Best Practices

React hooks are a powerful feature that let you use state and other React features without writing classes. Here are some tips for using them effectively:

## Rules of Hooks

1. **Only call hooks at the top level** of your component or custom hooks
2. **Don't call hooks inside loops, conditions, or nested functions**

## Common Hooks

- **useState**: For local component state
- **useEffect**: For side effects like data fetching
- **useContext**: For consuming context
- **useReducer**: For complex state logic
- **useCallback**: For memoizing functions
- **useMemo**: For memoizing values

## Example of useState and useEffect

\`\`\`jsx
function ProfilePage({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // This runs after render and when userId changes
    fetchUser(userId).then(userData => {
      setUser(userData);
    });
  }, [userId]);

  return user ? <Profile user={user} /> : <Loading />;
}
\`\`\`

Would you like me to explain any specific hook in more detail?`,
        id: crypto.randomUUID(),
      },
    ],
  },
  {
    from: "user",
    key: crypto.randomUUID(),
    versions: [
      {
        content:
          "Yes, could you explain useCallback and useMemo in more detail? When should I use one over the other?",
        id: crypto.randomUUID(),
      },
      {
        content:
          "I'm particularly interested in understanding the performance implications of useCallback and useMemo. Could you break down when each is most appropriate?",
        id: crypto.randomUUID(),
      },
      {
        content:
          "Thanks for the overview! Could you dive deeper into the specific use cases where useCallback and useMemo make the biggest difference in React applications?",
        id: crypto.randomUUID(),
      },
    ],
  },
  {
    from: "assistant",
    key: crypto.randomUUID(),
    reasoning: {
      content: `The user is asking for a detailed explanation of useCallback and useMemo. I should provide a clear and concise explanation of each hook's purpose and how they differ.

The useCallback hook is used to memoize functions to prevent unnecessary re-renders of child components that receive functions as props.

The useMemo hook is used to memoize values to avoid expensive recalculations on every render.

Both hooks help with performance optimization, but they serve different purposes.`,
      duration: 10,
    },
    versions: [
      {
        content: `## useCallback vs useMemo

Both hooks help with performance optimization, but they serve different purposes:

### useCallback

\`useCallback\` memoizes **functions** to prevent unnecessary re-renders of child components that receive functions as props.

\`\`\`jsx
// Without useCallback - a new function is created on every render
const handleClick = () => {
  console.log(count);
};

// With useCallback - the function is only recreated when dependencies change
const handleClick = useCallback(() => {
  console.log(count);
}, [count]);
\`\`\`

### useMemo

\`useMemo\` memoizes **values** to avoid expensive recalculations on every render.

\`\`\`jsx
// Without useMemo - expensive calculation runs on every render
const sortedList = expensiveSort(items);

// With useMemo - calculation only runs when items change
const sortedList = useMemo(() => expensiveSort(items), [items]);
\`\`\`

### When to use which?

- Use **useCallback** when:
  - Passing callbacks to optimized child components that rely on reference equality
  - Working with event handlers that you pass to child components

- Use **useMemo** when:
  - You have computationally expensive calculations
  - You want to avoid recreating objects that are used as dependencies for other hooks

### Performance Note

Don't overuse these hooks! They come with their own overhead. Only use them when you have identified a genuine performance issue.`,
        id: crypto.randomUUID(),
      },
    ],
  },
] satisfies MessageType[];

const models = [
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4o",
    name: "GPT-4o",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    providers: ["openai", "azure"],
  },
  {
    chef: "Anthropic",
    chefSlug: "anthropic",
    id: "claude-opus-4-20250514",
    name: "Claude 4 Opus",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    chef: "Anthropic",
    chefSlug: "anthropic",
    id: "claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    providers: ["google"],
  },
];

const suggestions = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing",
  "Best practices for React development",
  "Tell me about TypeScript benefits",
  "How to optimize database queries?",
  "What is the difference between SQL and NoSQL?",
  "Explain cloud computing basics",
];

const mockResponses = [
  "That's a great question! Let me help you understand this concept better. The key thing to remember is that proper implementation requires careful consideration of the underlying principles and best practices in the field.",
  "I'd be happy to explain this topic in detail. From my understanding, there are several important factors to consider when approaching this problem. Let me break it down step by step for you.",
  "This is an interesting topic that comes up frequently. The solution typically involves understanding the core concepts and applying them in the right context. Here's what I recommend...",
  "Great choice of topic! This is something that many developers encounter. The approach I'd suggest is to start with the fundamentals and then build up to more complex scenarios.",
  "That's definitely worth exploring. From what I can see, the best way to handle this is to consider both the theoretical aspects and practical implementation details.",
];

const delay = (ms: number): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new -- setTimeout requires a new Promise
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const chefs = ["OpenAI", "Anthropic", "Google"];


const SuggestionItem = ({
  suggestion,
  onClick,
}: {
  suggestion: string;
  onClick: (suggestion: string) => void;
}) => {
  const handleClick = useCallback(() => {
    onClick(suggestion);
  }, [onClick, suggestion]);

  return <Suggestion onClick={handleClick} suggestion={suggestion} />;
};

const ModelItem = ({
  m,
  isSelected,
  onSelect,
}: {
  m: (typeof models)[0];
  isSelected: boolean;
  onSelect: (id: string) => void;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(m.id);
  }, [onSelect, m.id]);

  return (
    <ModelSelectorItem onSelect={handleSelect} value={m.id}>
      <ModelSelectorLogo provider={m.chefSlug} />
      <ModelSelectorName>{m.name}</ModelSelectorName>
      <ModelSelectorLogoGroup>
        {m.providers.map((provider) => (
          <ModelSelectorLogo key={provider} provider={provider} />
        ))}
      </ModelSelectorLogoGroup>
      {isSelected ? (
        <CheckIcon className="ml-auto size-4" />
      ) : (
        <div className="ml-auto size-4" />
      )}
    </ModelSelectorItem>
  );
};

export const PlaygroundClient = () => {
  const toast = useToastManager();
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [, setStreamingMessageId] = useState<string | null>(null);

  const selectedModelData = useMemo(
    () => models.find((m) => m.id === model),
    [model]
  );

  const updateMessageContent = useCallback(
    (messageId: string, newContent: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.versions.some((v) => v.id === messageId)) {
            return {
              ...msg,
              versions: msg.versions.map((v) =>
                v.id === messageId ? { ...v, content: newContent } : v
              ),
            };
          }
          return msg;
        })
      );
    },
    []
  );

  const streamResponse = useCallback(
    async (messageId: string, content: string) => {
      setStatus("streaming");
      setStreamingMessageId(messageId);

      const words = content.split(" ");
      let currentContent = "";

      for (const [i, word] of words.entries()) {
        currentContent += (i > 0 ? " " : "") + word;
        updateMessageContent(messageId, currentContent);
        await delay(Math.random() * 100 + 50);
      }

      setStatus("ready");
      setStreamingMessageId(null);
    },
    [updateMessageContent]
  );

  const addUserMessage = useCallback(
    (content: string) => {
      const userMessage: MessageType = {
        from: "user",
        key: `user-${Date.now()}`,
        versions: [
          {
            content,
            id: `user-${Date.now()}`,
          },
        ],
      };

      setMessages((prev) => [...prev, userMessage]);

      setTimeout(() => {
        const assistantMessageId = `assistant-${Date.now()}`;
        const randomResponse =
          mockResponses[Math.floor(Math.random() * mockResponses.length)];

        const assistantMessage: MessageType = {
          from: "assistant",
          key: `assistant-${Date.now()}`,
          versions: [
            {
              content: "",
              id: assistantMessageId,
            },
          ],
        };

        setMessages((prev) => [...prev, assistantMessage]);
        streamResponse(assistantMessageId, randomResponse);
      }, 500);
    },
    [streamResponse]
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      setStatus("submitted");

      if (message.files?.length) {
        toast.add({
          title: "Files attached",
          description: `${message.files.length} file(s) attached to message`,
          type: "success",
        });
      }

      addUserMessage(message.text || "Sent with attachments");
      setText("");
    },
    [addUserMessage]
  );

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    []
  );


  const handleModelSelect = useCallback((modelId: string) => {
    setModel(modelId);
    setModelSelectorOpen(false);
  }, []);

  const isSubmitDisabled = useMemo(
    () => !(text.trim() || status) || status === "streaming",
    [text, status]
  );

  return (
    <div className={"relative max-h-[560px] min-h-40 flex flex-col size-full divide-y"}>
      <Conversation className="min-h-0">
        <ConversationContent>
          {messages.map(({ versions, ...message }) => (
            <MessageBranch defaultBranch={0} key={message.key}>
              <MessageBranchContent>
                {versions.map((version) => (
                  <Message
                    from={message.from}
                    key={`${message.key}-${version.id}`}
                  >
                    <div>
                      {/* {message.sources?.length && (
                        <Sources>
                          <SourcesTrigger count={message.sources.length} />
                          <SourcesContent>
                            {message.sources.map((source) => (
                              <Source
                                href={source.href}
                                key={source.href}
                                title={source.title}
                              />
                            ))}
                          </SourcesContent>
                        </Sources>
                      )} */}
                      {message.reasoning && (
                        <Reasoning duration={message.reasoning.duration}>
                          <ReasoningTrigger />
                          <ReasoningContent>
                            {message.reasoning.content}
                          </ReasoningContent>
                        </Reasoning>
                      )}
                      <MessageContent>
                        <MessageResponse>{version.content}</MessageResponse>
                      </MessageContent>
                    </div>
                  </Message>
                ))}
              </MessageBranchContent>

            </MessageBranch>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="grid shrink-0 gap-4 pt-4">
        <div className="w-full px-4 pb-4">
          <PromptInput globalDrop multiple className="flex flex-row" onSubmit={handleSubmit}>
            <PromptInputBody className="flex px-4 py-2 items-center">
              {/* <PromptInputTools>
                <ModelSelector
                  onOpenChange={setModelSelectorOpen}
                  open={modelSelectorOpen}
                >
                  <ModelSelectorTrigger render={ <PromptInputButton>
                      {selectedModelData?.chefSlug && (
                        <ModelSelectorLogo
                          provider={selectedModelData.chefSlug}
                        />
                      )}
                      {selectedModelData?.name && (
                        <ModelSelectorName>
                          {selectedModelData.name}
                        </ModelSelectorName>
                      )}
                    </PromptInputButton>}/>
                   
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {chefs.map((chef) => (
                        <ModelSelectorGroup heading={chef} key={chef}>
                          {models
                            .filter((m) => m.chef === chef)
                            .map((m) => (
                              <ModelItem
                                isSelected={model === m.id}
                                key={m.id}
                                m={m}
                                onSelect={handleModelSelect}
                              />
                            ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools> */}
              <PromptInputTextarea className="flex-1 p-0" onChange={handleTextChange} value={text} />
              <PromptInputSubmit disabled={isSubmitDisabled} status={status} />
            </PromptInputBody>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};
