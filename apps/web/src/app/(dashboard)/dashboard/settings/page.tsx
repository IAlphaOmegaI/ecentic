"use client";

import { CheckIcon, PlusIcon, XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useState } from "react";

type SettingsSection =
  | "account"
  | "team"
  | "integrations"
  | "notifications"
  | "simulation"
  | "billing";

const sectionItems = [
  { id: "account" as const, label: "Account" },
  { id: "team" as const, label: "Team" },
  { id: "integrations" as const, label: "Integrations" },
  { id: "notifications" as const, label: "Notifications" },
  { id: "simulation" as const, label: "Simulation Config" },
  { id: "billing" as const, label: "Billing" },
] as const;

const Toggle = ({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={cn(
      "relative inline-flex h-5 w-9 items-center transition-colors",
      enabled ? "bg-primary" : "bg-accent-foreground",
    )}
    role="switch"
    aria-checked={enabled}
  >
    <span
      className={cn(
        "inline-block size-3.5 bg-white transition-transform",
        enabled ? "translate-x-4.5" : "translate-x-0.5",
      )}
    />
  </button>
);

export default () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [notificationToggles, setNotificationToggles] = useState({
    winRateDrop: true,
    simulationComplete: true,
    optimizationReady: true,
    autoPub: false,
    modelDrift: true,
    competitorUpdate: false,
    newCompetitor: true,
    weeklyDigest: true,
  });

  const toggleNotification = (key: keyof typeof notificationToggles) => {
    setNotificationToggles((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-medium text-xl text-foreground">Settings</h1>
        <p className="font-light text-foreground-dimmed text-sm">
          Manage your account, integrations, and preferences.
        </p>
      </div>

      <div className="flex gap-6">
        <nav className="hidden w-48 shrink-0 flex-col gap-0.5 md:flex">
          {sectionItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "px-3 py-2 text-left text-sm font-medium transition-colors",
                activeSection === item.id
                  ? "bg-primary text-white"
                  : "text-foreground-dimmed hover:bg-background-dimmed hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          {activeSection === "account" && (
            <div className="flex flex-col gap-4">
              <div className="border border-accent-foreground bg-background-rich p-6">
                <h2 className="mb-4 font-medium text-foreground text-base">
                  Profile
                </h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex size-16 items-center justify-center bg-primary font-semibold text-2xl text-white">
                    J
                  </div>
                  <button
                    type="button"
                    className="border border-accent-foreground px-3 py-1.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
                  >
                    Change Avatar
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { label: "Full Name", value: "Jane Smith" },
                    { label: "Email", value: "jane@acmestore.com" },
                    { label: "Company", value: "Acme Store" },
                    { label: "Role", value: "Founder / CEO" },
                  ].map((field) => (
                    <div key={field.label} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-foreground">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        defaultValue={field.value}
                        className="border border-accent-foreground bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 bg-primary px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-primary/90"
                >
                  Save Changes
                </button>
              </div>

              <div className="border border-accent-foreground bg-background-rich p-6">
                <h2 className="mb-4 font-medium text-foreground text-base">
                  Change Password
                </h2>
                <div className="flex flex-col gap-3 max-w-sm">
                  {["Current Password", "New Password", "Confirm New Password"].map(
                    (label) => (
                      <div key={label} className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-foreground">
                          {label}
                        </label>
                        <input
                          type="password"
                          className="border border-accent-foreground bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                    ),
                  )}
                  <button
                    type="button"
                    className="mt-1 w-fit border border-accent-foreground bg-background-rich px-4 py-2 text-foreground text-sm transition-colors hover:bg-background-dimmed"
                  >
                    Update Password
                  </button>
                </div>
              </div>

              <div className="border border-error/20 bg-error/5 p-6">
                <h2 className="mb-2 font-medium text-error text-base">
                  Danger Zone
                </h2>
                <p className="mb-3 font-light text-foreground-dimmed text-sm">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
                <button
                  type="button"
                  className="border border-error px-4 py-2 font-medium text-error text-sm transition-colors hover:bg-error hover:text-white"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeSection === "team" && (
            <div className="border border-accent-foreground bg-background-rich">
              <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
                <p className="font-medium text-foreground text-sm">
                  Team Members
                </p>
                <button
                  type="button"
                  className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
                >
                  <PlusIcon className="size-3.5" />
                  Invite Member
                </button>
              </div>
              <div className="divide-y divide-accent-foreground">
                {[
                  { name: "Jane Smith", email: "jane@acmestore.com", role: "Owner" },
                  { name: "Marcus Johnson", email: "marcus@acmestore.com", role: "Admin" },
                ].map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center bg-primary/10 font-medium text-primary text-sm">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {member.name}
                        </p>
                        <p className="font-light text-foreground-dimmed text-xs">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="border border-accent-foreground px-2 py-0.5 text-foreground-dimmed text-xs">
                        {member.role}
                      </span>
                      {member.role !== "Owner" && (
                        <button
                          type="button"
                          className="font-light text-error text-xs hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-accent-foreground border-t p-4">
                <p className="mb-2 font-medium text-foreground text-xs">
                  Invite by email
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    className="flex-1 border border-accent-foreground bg-background px-3 py-1.5 text-foreground text-sm placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
                  />
                  <select className="border border-accent-foreground bg-background px-2 text-foreground text-sm focus:outline-none">
                    <option>Editor</option>
                    <option>Viewer</option>
                    <option>Admin</option>
                  </select>
                  <button
                    type="button"
                    className="bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "integrations" && (
            <div className="flex flex-col gap-4">
              <div className="border border-accent-foreground bg-background-rich">
                <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                  <p className="font-medium text-foreground text-sm">
                    Connected Stores
                  </p>
                </div>
                <div className="divide-y divide-accent-foreground">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center bg-[#96BF48] text-xs font-bold text-white">
                        SH
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          acme-store.myshopify.com
                        </p>
                        <p className="font-light text-foreground-dimmed text-xs">
                          Synced 30 minutes ago · 247 products
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-success/10 px-2 py-0.5 font-medium text-success text-xs">
                        Connected
                      </span>
                      <button
                        type="button"
                        className="border border-accent-foreground px-2.5 py-1 text-foreground text-xs transition-colors hover:bg-background-dimmed"
                      >
                        Sync Now
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border-accent-foreground border-t p-4">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 border border-dashed border-accent-foreground px-3 py-2 text-foreground-dimmed text-sm transition-colors hover:border-primary hover:text-primary"
                  >
                    <PlusIcon className="size-3.5" />
                    Connect another store
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="border border-accent-foreground bg-background-rich">
              <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                <p className="font-medium text-foreground text-sm">
                  Email Notifications
                </p>
              </div>
              <div className="divide-y divide-accent-foreground">
                {(
                  [
                    { key: "winRateDrop", label: "Win Rate Drops", description: "Alert when any product drops >5%" },
                    { key: "simulationComplete", label: "Simulation Complete", description: "When a simulation batch finishes" },
                    { key: "optimizationReady", label: "Optimization Ready", description: "New optimization suggestions available" },
                    { key: "autoPub", label: "Auto-Published", description: "When auto-optimization publishes changes" },
                    { key: "modelDrift", label: "Model Drift Detected", description: "When an AI model updates its behavior" },
                    { key: "competitorUpdate", label: "Competitor Updates", description: "When tracked competitor listings change" },
                    { key: "newCompetitor", label: "New Competitors", description: "When a new competitor is detected" },
                    { key: "weeklyDigest", label: "Weekly Digest", description: "Summary of the week's performance" },
                  ] as const
                ).map(({ key, label, description }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {label}
                      </p>
                      <p className="font-light text-foreground-dimmed text-xs">
                        {description}
                      </p>
                    </div>
                    <Toggle
                      enabled={notificationToggles[key]}
                      onToggle={() => toggleNotification(key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "simulation" && (
            <div className="flex flex-col gap-4">
              <div className="border border-accent-foreground bg-background-rich p-4">
                <h2 className="mb-4 font-medium text-foreground text-base">
                  AI Models
                </h2>
                <div className="flex flex-col gap-2">
                  {["GPT-4", "GPT-4o", "Claude 3.5 Sonnet", "Gemini Pro", "Perplexity"].map(
                    (model, index) => (
                      <label
                        key={model}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <div className={cn(
                          "flex size-4 items-center justify-center border",
                          index < 3 ? "border-primary bg-primary" : "border-accent-foreground",
                        )}>
                          {index < 3 && <CheckIcon className="size-2.5 text-white" />}
                        </div>
                        <span className="font-light text-foreground text-sm">
                          {model}
                        </span>
                        {index >= 3 && (
                          <span className="bg-warning/10 px-1.5 py-0.5 text-warning text-xs">
                            Dominate+
                          </span>
                        )}
                      </label>
                    ),
                  )}
                </div>
              </div>

              <div className="border border-accent-foreground bg-background-rich p-4">
                <h2 className="mb-4 font-medium text-foreground text-base">
                  Simulation Frequency
                </h2>
                <div className="flex flex-col gap-2">
                  {["Manual only", "Daily", "Weekly"].map((option, index) => (
                    <label
                      key={option}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className={cn(
                        "flex size-4 items-center justify-center border rounded-full",
                        index === 1 ? "border-primary bg-primary" : "border-accent-foreground",
                      )}>
                        {index === 1 && <div className="size-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="font-light text-foreground text-sm">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-accent-foreground bg-background-rich p-4">
                <h2 className="mb-3 font-medium text-foreground text-base">
                  Purchase Persona
                </h2>
                <select className="w-full border border-accent-foreground bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none">
                  <option>Budget-conscious shopper</option>
                  <option>Premium buyer</option>
                  <option>Technical researcher</option>
                  <option>Gift purchase</option>
                  <option>Custom...</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === "billing" && (
            <div className="flex flex-col gap-4">
              <div className="border border-accent-foreground bg-background-rich p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground text-base">
                      Compete Plan
                    </p>
                    <p className="font-semibold text-primary text-2xl mt-1">
                      $149
                      <span className="font-light text-foreground-dimmed text-base">
                        /mo
                      </span>
                    </p>
                  </div>
                  <span className="bg-success/10 px-2 py-0.5 font-medium text-success text-xs">
                    Active
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-light text-foreground-dimmed">Products used</span>
                    <span className="font-medium text-foreground">10 / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-foreground-dimmed">Billing cycle</span>
                    <span className="font-medium text-foreground">Monthly</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-foreground-dimmed">Next billing date</span>
                    <span className="font-medium text-foreground">April 6, 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-foreground-dimmed">Payment method</span>
                    <span className="font-medium text-foreground">Visa ending in 4242</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 bg-primary py-2 font-medium text-sm text-white transition-colors hover:bg-primary/90"
                  >
                    Upgrade to Dominate
                  </button>
                  <button
                    type="button"
                    className="border border-accent-foreground px-4 py-2 text-foreground-dimmed text-sm transition-colors hover:bg-background-dimmed"
                  >
                    Cancel Plan
                  </button>
                </div>
              </div>

              <div className="border border-accent-foreground bg-background-rich p-6">
                <p className="mb-3 font-medium text-foreground text-sm">
                  Invoice History
                </p>
                <div className="divide-y divide-accent-foreground">
                  {[
                    { date: "Mar 6, 2026", amount: "$149.00", status: "Paid" },
                    { date: "Feb 6, 2026", amount: "$149.00", status: "Paid" },
                    { date: "Jan 6, 2026", amount: "$149.00", status: "Paid" },
                  ].map((invoice) => (
                    <div
                      key={invoice.date}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <p className="font-light text-foreground text-sm">
                          {invoice.date}
                        </p>
                        <p className="font-light text-foreground-dimmed text-xs">
                          {invoice.amount}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-success/10 px-1.5 py-0.5 text-success text-xs font-medium">
                          {invoice.status}
                        </span>
                        <button
                          type="button"
                          className="font-light text-primary text-xs hover:underline"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
