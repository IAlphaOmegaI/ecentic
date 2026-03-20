"use client";

import { ArrowLeftIcon, ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link, { useLinkStatus } from "next/link";
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
  const brands = new Set(
    competitors.map((record) => record.brand).filter(Boolean),
  );

  return (
    <Motion.Stagger
      stagger={0.05}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <Motion.Item className="border-accent-foreground border-b px-8">
        <div className="border-accent-foreground border-x p-6">
          {children}
          <div className="mt-4 w-fit border border-primary/20 bg-primary/5 px-4 py-2.5 text-primary text-sm">
            {competitors.length} competitor products across {brands.size} brands
            — {selected} selected
          </div>
        </div>
      </Motion.Item>

      <Motion.Item className="px-8 flex-1">
        <CompetitorList
          competitors={competitors}
          onToggle={handleToggle}
          onRemove={handleRemove}
        />
      </Motion.Item>

      <Motion.Item className="border-accent-foreground border-t px-8">
        <div className="flex w-full items-center justify-between border-accent-foreground border-x p-6">
          <Button
            variant="outline"
            color="accent"
            type="button"
            render={<Link href="/onboarding/competitors" />}
          >
            <Back />
          </Button>
          <Button
            variant="flat"
            color="primary"
            type="button"
            disabled={selected === 0}
            render={<Link href="/onboarding/scan" />}
          >
            <Next />
          </Button>
        </div>
      </Motion.Item>
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

const Next = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      Next: Run Scan
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
