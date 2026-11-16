"use client";

import {
  ArrowRightIcon,
  ChevronDownIcon,
  GaugeIcon,
  RadarIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@zenncore/web/components/dialog";
import {
  field,
  InferredForm,
  InferredFormField,
  type RefinedProps,
} from "@zenncore/web/components/inferred-form";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  type FocusEventHandler,
  type ReactNode,
  type Ref,
  type RefObject,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { Motion } from "@/components/motion";
import { Link } from "@/i18n/navigation";
import { Spring } from "@/lib/animations";

const WorkspaceAccess = createContext<((blocked: boolean) => void) | null>(
  null,
);

// A streamed paywall marks the underlying workspace inert, while its own
// controls and the account/navigation menus remain reachable.
export const WorkspaceAccessBlocker = () => {
  const setBlocked = useContext(WorkspaceAccess);
  useEffect(() => {
    setBlocked?.(true);
    return () => setBlocked?.(false);
  }, [setBlocked]);
  return null;
};

// The content remains the scrolling surface. The fade never intercepts a row,
// and the bottom space keeps the final action above the assistant dock.
export const WorkspaceViewport = ({
  children,
  overlay,
}: {
  children: ReactNode;
  overlay: ReactNode;
}) => {
  const viewport = useRef<HTMLElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!viewport.current || !end.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setMoreBelow(!entry?.isIntersecting),
      { root: viewport.current },
    );
    observer.observe(end.current);
    return () => observer.disconnect();
  }, []);

  return (
    <WorkspaceAccess value={setBlocked}>
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background md:rounded-tl-lg">
        <main
          ref={viewport}
          inert={blocked}
          className="h-full min-w-0 scroll-pb-28 overflow-y-auto overscroll-y-contain pb-28"
        >
          {children}
          <div ref={end} aria-hidden className="h-px" />
        </main>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-background via-background/85 to-transparent transition-opacity duration-150 motion-reduce:transition-none",
            moreBelow ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          inert={blocked}
          className="pointer-events-none absolute right-24 bottom-(--floating-controls-bottom) left-3 z-20 flex h-14 items-center justify-center sm:left-6 lg:inset-x-24"
        >
          <AssistantPreview blocked={blocked} workspaceRef={viewport} />
        </div>
        {overlay}
      </div>
    </WorkspaceAccess>
  );
};

type ChatGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  collapsedRadius: string;
  expandedRadius: string;
};

const AssistantPreview = ({
  blocked,
  workspaceRef,
}: {
  blocked: boolean;
  workspaceRef: RefObject<HTMLElement | null>;
}) => {
  const translate = useTranslations("dashboard.nav.assistant");
  const { reduced } = useInteractive();
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [draft, setDraft] = useState("");
  const [geometry, setGeometry] = useState<ChatGeometry | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const radiusSample = useRef<HTMLSpanElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const actions = useRef<Dialog.Actions>(null);
  const isOpen = open && !blocked;

  // Only layout geometry is measured. Colors, rounding and spacing come from
  // the theme; the inverse transform starts at the real dock, not an estimate.
  const measure = useCallback(() => {
    const workspace = workspaceRef.current;
    const dock = trigger.current;
    const radius = radiusSample.current;
    if (!workspace || !dock || !radius) return;
    const bounds = workspace.getBoundingClientRect();
    const source = dock.getBoundingClientRect();
    const view = workspace.ownerDocument.defaultView;
    const visualViewport = view?.visualViewport;
    const visibleTop = Math.max(bounds.top, visualViewport?.offsetTop ?? 0);
    const visibleBottom = Math.min(
      bounds.bottom,
      (visualViewport?.height ?? bounds.bottom) +
        (visualViewport?.offsetTop ?? 0),
    );
    const width = bounds.width * (bounds.width < 640 ? 0.9 : 0.8);
    const height = (visibleBottom - visibleTop) * 0.8;
    const left = bounds.left + (bounds.width - width) / 2;
    const top = visibleTop + (visibleBottom - visibleTop - height) / 2;
    const scaleX = source.width / width;
    const scaleY = source.height / height;
    const rounded = view?.getComputedStyle(radius).borderRadius ?? "0px";
    setGeometry({
      left,
      top,
      width,
      height,
      scaleX,
      scaleY,
      x: source.left + source.width / 2 - left - width / 2,
      y: source.top + source.height / 2 - top - height / 2,
      collapsedRadius: `${source.height / (2 * scaleX)}px / ${source.height / (2 * scaleY)}px`,
      expandedRadius: `${rounded} / ${rounded}`,
    });
  }, [workspaceRef]);

  useEffect(() => {
    if (!isOpen) return;
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const view = workspace.ownerDocument.defaultView;
    const resize = new ResizeObserver(measure);
    resize.observe(workspace);
    view?.visualViewport?.addEventListener("resize", measure);
    return () => {
      resize.disconnect();
      view?.visualViewport?.removeEventListener("resize", measure);
    };
  }, [isOpen, workspaceRef, measure]);

  useEffect(() => {
    if (!blocked) return;
    setOpen(false);
    setPresent(false);
    actions.current?.unmount();
  }, [blocked]);

  const config = {
    draft: field<
      "custom",
      z.ZodString,
      JudyComposerProps & { Component: typeof JudyComposer }
    >({
      shape: "custom",
      Component: JudyComposer,
      validator: z.string(),
      label: translate("chat.placeholder"),
      placeholder: translate("chat.placeholder"),
      hint: translate("chat.draftHint"),
      sendLabel: translate("chat.send"),
      classList: { label: "sr-only" },
    }),
  };
  const collapsed = geometry
    ? {
        x: geometry.x,
        y: geometry.y,
        scaleX: geometry.scaleX,
        scaleY: geometry.scaleY,
        borderRadius: geometry.collapsedRadius,
      }
    : {};
  const expanded = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    borderRadius: geometry?.expandedRadius,
  };

  return (
    <Dialog
      open={isOpen}
      actionsRef={actions}
      onOpenChange={(next, details) => {
        if (next && !blocked) {
          measure();
          setPresent(true);
        } else if (!reduced) {
          details.preventUnmountOnClose();
        } else {
          setPresent(false);
        }
        setOpen(next);
      }}
    >
      <div className="relative w-full max-w-80">
        <span
          ref={radiusSample}
          aria-hidden
          className="pointer-events-none absolute size-0 rounded-overlay"
        />
        <div
          aria-hidden
          className="mask-radial-from-50% mask-radial-to-100% pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-full backdrop-blur-xs"
        />
        <div
          aria-hidden
          className="mask-radial-from-50% mask-radial-to-100% pointer-events-none absolute -inset-x-3 -inset-y-2 rounded-full backdrop-blur-sm"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-1 inset-y-0 rounded-full bg-emphasis/20 blur-md"
        />
        <DialogTrigger
          ref={trigger}
          data-judy-dock
          className={cn(
            "pointer-events-auto relative inset-shadow-background-rich/20 inset-shadow-sm flex h-12 w-full justify-start gap-2 rounded-full border-background-rich/15 bg-emphasis bg-linear-to-b from-background-rich/15 via-emphasis to-emphasis px-4 text-background-rich shadow-none transition-colors duration-150 hover:bg-emphasis hover:from-background-rich/20 focus-visible:outline-offset-2 active:bg-emphasis motion-reduce:transition-none",
            present && "opacity-0",
          )}
        >
          <Image
            src="/images/assistant/judy-fiat500.webp"
            alt=""
            width={72}
            height={60}
            className="h-8 w-10 shrink-0 object-contain"
          />
          <span className="min-w-0 flex-1 truncate text-left font-medium text-sm">
            {translate("title")}
          </span>
          <span className="rounded-full bg-background-rich/10 px-2 py-0.5 text-background-rich/70 text-xs">
            {translate("status")}
          </span>
          <ChevronDownIcon
            aria-hidden
            className="size-4 shrink-0 rotate-180 text-background-rich/65"
          />
        </DialogTrigger>
      </div>
      {geometry && (
        <DialogPopup
          data-judy-chat
          initialFocus={closeButton}
          finalFocus={trigger}
          className="z-80 m-0 max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-overlay border-background-rich/15 bg-emphasis p-0 text-background-rich shadow-sm transition-none data-ending-style:scale-100 data-starting-style:scale-100 data-ending-style:opacity-100 data-starting-style:opacity-100"
          classList={{
            backdrop:
              "z-70 bg-emphasis opacity-30 transition-opacity duration-200 motion-reduce:transition-none",
          }}
          style={{
            left: geometry.left,
            top: geometry.top,
            width: geometry.width,
            height: geometry.height,
          }}
          render={
            <Motion.Item
              initial={reduced ? expanded : collapsed}
              animate={isOpen || reduced ? expanded : collapsed}
              transition={reduced ? { duration: 0 } : Spring.Snappy}
              onAnimationComplete={() => {
                if (isOpen) return;
                actions.current?.unmount();
                setPresent(false);
              }}
            />
          }
        >
          <Motion.Item
            className="flex h-full min-h-0 flex-col"
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{
              duration: reduced ? 0 : 0.15,
              delay: isOpen && !reduced ? 0.1 : 0,
            }}
          >
            <header className="flex shrink-0 items-center gap-3 border-background-rich/10 border-b px-4 py-3 sm:px-6">
              <Motion.Item
                aria-hidden
                data-judy-car
                initial={false}
                animate={
                  isOpen && !reduced
                    ? { rotate: [0, -8, 7, -4, 0], y: [0, -4, 0, -2, 0] }
                    : { rotate: 0, y: 0 }
                }
                transition={{
                  duration: reduced ? 0 : 0.5,
                  delay: reduced ? 0 : 0.15,
                  ease: "easeInOut",
                }}
              >
                <Image
                  src="/images/assistant/judy-fiat500.webp"
                  alt=""
                  width={72}
                  height={60}
                  className="h-8 w-10 object-contain"
                />
              </Motion.Item>
              <DialogTitle className="m-0 flex-1 font-semibold text-background-rich text-base">
                {translate("name")}
              </DialogTitle>
              <span className="rounded-full bg-background-rich/10 px-2 py-1 text-background-rich/65 text-xs">
                {translate("status")}
              </span>
              <DialogClose
                ref={closeButton}
                aria-label={translate("chat.close")}
                className="size-8 rounded-full border-0 bg-background-rich/10 p-0 text-background-rich hover:bg-background-rich/20 active:bg-background-rich/20"
              >
                <ChevronDownIcon aria-hidden className="size-4" />
              </DialogClose>
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
              <div className="mx-auto my-auto w-full max-w-xl shrink-0">
                <h2 className="text-balance font-heading font-semibold text-2xl text-background-rich sm:text-3xl">
                  {translate("chat.heading")}
                </h2>
                <DialogDescription className="mt-4 mb-0 max-w-lg text-pretty text-background-rich/65 text-sm leading-6">
                  {translate("description")}
                </DialogDescription>
                <Suspense>
                  <AssistantNavigation
                    onNavigate={() => actions.current?.close()}
                  />
                </Suspense>
              </div>
            </div>
            <div className="shrink-0 border-background-rich/10 border-t px-4 py-4 sm:px-6">
              <InferredForm
                config={config}
                renderFields={false}
                defaultValues={{ draft }}
                onChange={(values) => setDraft(values.draft ?? "")}
                onSubmit={() => undefined}
                className="space-y-0"
              >
                <InferredFormField name="draft" {...config.draft} />
              </InferredForm>
            </div>
          </Motion.Item>
        </DialogPopup>
      )}
    </Dialog>
  );
};

// Route data belongs to the links' streaming boundary so the workspace and
// Judy dock remain part of the prerendered shell.
const AssistantNavigation = ({ onNavigate }: { onNavigate: () => void }) => {
  const navigation = useTranslations("dashboard.workspace.nav");
  const { store } = useParams<{ store?: string }>();
  if (!store) return null;

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {(
        [
          { key: "products", Icon: ShoppingCartIcon },
          { key: "optimize", Icon: GaugeIcon },
          { key: "research", Icon: RadarIcon },
        ] as const
      ).map(({ key, Icon }) => (
        <Button
          key={key}
          variant="soft"
          color="accent"
          className="bg-background-rich/10 text-background-rich/85 hover:bg-background-rich/15 hover:text-background-rich active:bg-background-rich/20"
          render={<Link href={`/dashboard/${store}/${key}`} />}
          onClick={onNavigate}
        >
          <Icon aria-hidden className="size-4" />
          {navigation(key)}
        </Button>
      ))}
    </div>
  );
};

const JudyComposer = ({
  value,
  onValueChange,
  name,
  label,
  placeholder,
  hint,
  sendLabel,
  onBlur,
  ref,
}: JudyComposerProps) => {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [multiline, setMultiline] = useState(false);
  const hintID = useId();
  const synchronizeSize = useCallback(() => {
    const input = textarea.current;
    if (!input) return;
    if (!CSS.supports("field-sizing", "content")) {
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
    }
    const style = getComputedStyle(input);
    const contentHeight =
      input.clientHeight -
      Number.parseFloat(style.paddingTop) -
      Number.parseFloat(style.paddingBottom);
    setMultiline(contentHeight > Number.parseFloat(style.lineHeight) * 1.5);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Controlled text can change scrollHeight without resizing a capped textarea.
  useEffect(() => {
    synchronizeSize();
  }, [value, synchronizeSize]);

  useEffect(() => {
    const input = textarea.current;
    if (!input) return;
    const resize = new ResizeObserver(synchronizeSize);
    resize.observe(input);
    return () => resize.disconnect();
  }, [synchronizeSize]);

  return (
    <div className="space-y-2">
      <Textarea
        data-judy-composer
        value={value}
        onValueChange={onValueChange}
        className={cn(
          "items-end border-background-rich/15 bg-background-rich/5 focus-within:border-background-rich/30",
          multiline ? "rounded-lg" : "rounded-full",
        )}
      >
        <TextareaInput
          ref={(element) => {
            textarea.current = element;
            if (typeof ref === "function") ref(element);
            else if (ref) ref.current = element;
          }}
          name={name}
          aria-label={label}
          aria-describedby={hintID}
          placeholder={placeholder}
          onBlur={onBlur}
          rows={1}
          maxLength={4000}
          className="field-sizing-content max-h-32 min-h-12 resize-none px-4 py-3 text-background-rich text-sm leading-6 placeholder:text-background-rich/40"
        />
        <Button
          disabled
          type="submit"
          size="icon"
          variant="soft"
          color="accent"
          className="m-2 size-8 shrink-0 rounded-full bg-background-rich/10 text-background-rich/85 disabled:opacity-40"
          aria-label={sendLabel}
          title={hint}
        >
          <ArrowRightIcon aria-hidden className="size-4 -rotate-90" />
        </Button>
      </Textarea>
      <p id={hintID} className="px-4 text-background-rich/55 text-xs leading-5">
        {hint}
      </p>
    </div>
  );
};

type JudyComposerProps = RefinedProps<string> & {
  name?: string;
  label: string;
  placeholder: string;
  hint: string;
  sendLabel: string;
  ref?: Ref<HTMLTextAreaElement>;
  onBlur?: FocusEventHandler<HTMLTextAreaElement>;
};
