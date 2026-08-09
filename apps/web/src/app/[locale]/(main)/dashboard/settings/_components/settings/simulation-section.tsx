"use client";

import { Checkbox, CheckboxGroup } from "@zenncore/web/components/checkbox";
import { Radio, RadioGroup } from "@zenncore/web/components/radio";
import { useMessages, useTranslations } from "next-intl";
import { useMemo } from "react";

export const SimulationSection = ({
  selectedModels,
  onSelectedModelsChange,
  frequency,
  onFrequencyChange,
  persona,
  onPersonaChange,
}: {
  selectedModels: string[];
  onSelectedModelsChange: (value: string[]) => void;
  frequency: string;
  onFrequencyChange: (value: string) => void;
  persona: string;
  onPersonaChange: (value: string) => void;
}) => {
  const translate = useTranslations("dashboard.settings.simulation");
  const messages = useMessages();

  const frequencyOptions = messages.dashboard.settings.simulation.frequency
    .options as string[];
  const personaOptions = messages.dashboard.settings.simulation.persona
    .options as string[];

  const aiModels = useMemo(
    () =>
      [
        { value: "gpt", label: "ChatGPT", tier: "compete" as const },
        {
          value: "claude-3-5-sonnet",
          label: "Claude 3.5 Sonnet",
          tier: "compete" as const,
        },
        { value: "gemini-pro", label: "Gemini Pro", tier: "dominate" as const },
        { value: "perplexity", label: "Perplexity", tier: "dominate" as const },
      ] as const,
    [],
  );

  return (
    <div className="divide-y divide-accent-foreground">
      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-medium text-base text-foreground">
            {translate("models.title")}
          </p>
        </div>
        <div className="p-6">
          <CheckboxGroup
            value={selectedModels}
            onValueChange={onSelectedModelsChange}
            className="flex flex-col gap-3"
          >
            {aiModels.map((model) => (
              <div key={model.value} className="flex items-center gap-3">
                <Checkbox value={model.value}>{model.label}</Checkbox>
                {model.tier === "dominate" && (
                  <span className="bg-warning/10 px-1.5 py-0.5 text-sm text-warning">
                    {translate("models.dominateBadge")}
                  </span>
                )}
              </div>
            ))}
          </CheckboxGroup>
        </div>
      </div>

      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-medium text-base text-foreground">
            {translate("frequency.title")}
          </p>
        </div>
        <div className="p-6">
          <RadioGroup
            value={frequency}
            onValueChange={(value) => onFrequencyChange(value as string)}
            className="flex flex-col gap-3"
          >
            {frequencyOptions.map((option) => (
              <Radio key={option} value={option}>
                {option}
              </Radio>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-medium text-base text-foreground">
            {translate("persona.title")}
          </p>
        </div>
        <div className="p-6">
          <select
            value={persona}
            onChange={(event) => onPersonaChange(event.target.value)}
            className="w-full max-w-sm border border-accent-foreground bg-background px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none"
          >
            {personaOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
