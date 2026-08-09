"use client";

import { ArrowLeftIcon, ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useLinkStatus } from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
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
  const translate = useTranslations("onboarding.competitors.review");
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
      className="flex h-full flex-col overflow-hidden"
    >
      <Motion.Item className="border-accent-foreground border-b px-8">
        <div className="relative border-accent-foreground border-x p-6">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          {children}
          <div className="mt-4 w-fit border border-primary/20 bg-primary/5 px-4 py-2.5 text-primary text-sm">
            {translate("summary", {
              total: String(competitors.length),
              brands: String(brands.size),
              selected: String(selected),
            })}
          </div>
        </div>
      </Motion.Item>

      <Motion.Item className="min-h-0 flex-1 px-8">
        <CompetitorList
          competitors={competitors}
          onToggle={handleToggle}
          onRemove={handleRemove}
        />
      </Motion.Item>

      <Motion.Item className="border-accent-foreground border-t px-8">
        <div className="relative flex w-full items-center justify-between border-accent-foreground border-x p-6">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Button
            color="accent"
            type="button"
            render={<Link href="/onboarding/competitors" />}
          >
            <Back />
          </Button>
          <Button
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
  const translate = useTranslations("onboarding.competitors.review.action");

  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      {translate("back")}
    </>
  );
};

const Next = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.competitors.review.action");

  return (
    <>
      {translate("next")}
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
