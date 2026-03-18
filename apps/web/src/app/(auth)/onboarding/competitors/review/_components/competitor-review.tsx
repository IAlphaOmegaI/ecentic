"use client";

import { ArrowLeftIcon, ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Motion } from "@/components/motion";
import * as Competitor from "@/server/app/competitor";
import { CompetitorList } from "../../_components/competitor-list";

export namespace CompetitorReview {
  export type Props = {
    children: ReactNode;
    existing: Competitor.Type[];
  };
}

export const CompetitorReview = ({
  children,
  existing,
}: CompetitorReview.Props) => {
  const router = useRouter();
  const [competitors, setCompetitors] = useState<Competitor.Type[]>(existing);

  const handleToggle = async (id: string) => {
    const target = competitors.find((record) => record.id === id);
    if (!target) return;

    setCompetitors((previous) =>
      previous.map((record) =>
        record.id === id ? { ...record, selected: !record.selected } : record,
      ),
    );

    void Competitor.toggleSelection({ id, selected: !target.selected });
  };

  const handleRemove = async (id: string) => {
    setCompetitors((previous) => previous.filter((record) => record.id !== id));
    void Competitor.removeForUser({ id });
  };

  const selected = competitors.filter((record) => record.selected).length;

  return (
    <Motion.Stagger stagger={0.05} className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        {children}

        <Motion.Item>
          <CompetitorList
            competitors={competitors}
            onToggle={handleToggle}
            onRemove={handleRemove}
          />
        </Motion.Item>

        <Motion.Up className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            color="neutral"
            type="button"
            className="text-foreground-dimmed text-sm"
            render={<Link href="/onboarding/competitors" />}
          >
            <Back />
          </Button>
          <Button
            variant="flat"
            color="primary"
            type="button"
            onClick={() => router.push("/onboarding/scan")}
            disabled={selected === 0}
            className="px-6 py-2 font-medium text-sm"
          >
            Next: Run Scan
            <ArrowRightIcon className="size-4" />
          </Button>
        </Motion.Up>
      </div>
    </Motion.Stagger>
  );
};

const Back = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      Back
    </>
  );
};
