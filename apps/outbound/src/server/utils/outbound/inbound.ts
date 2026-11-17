export type Mail = {
  id: string;
  threadId: string;
  labelIds?: string[];
  internalDate: string;
  headers: Record<string, string>;
  text: string;
  textTruncated?: boolean;
};

export const addresses = (value: string) => [
  ...new Set(
    (
      value.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ??
      []
    ).map((address) => address.toLowerCase()),
  ),
];
export const messageIds = (value: string): string[] =>
  value.match(/<[^<>\r\n]+>/g) ?? [];

/** Explicit opt-outs win over auto-reply markers. Ambiguous messages stop for review. */
export const classifyInbound = (mail: Mail) => {
  const newest =
    mail.text.split(
      /\n(?:On .{1,200}wrote:|Le .{1,200}écrit :|Am .{1,200}schrieb|>)/i,
    )[0] ?? mail.text;
  const text = `${mail.headers["subject"] ?? ""}\n${newest}`;
  if (
    /\b(unsubscribe|opt[ -]?out|remove me|remove us|do not (?:email|contact)|don'?t (?:email|contact)|stop (?:emailing|contacting)|no thanks|not interested|kein interesse|abmelden|baja|no me contact|pas intéress|désabonn|non interessat)\b/i.test(
      text,
    ) ||
    /^\s*(?:no|nein|non)\s*[.!]?\s*$/i.test(newest)
  )
    return "optout" as const;
  if (
    /\b5\.1\.[0-9]\b/.test(mail.text) &&
    /mailer-daemon|postmaster|delivery[ -]status|undeliver/i.test(
      `${mail.headers["from"]}\n${mail.headers["content-type"]}\n${mail.headers["subject"]}`,
    )
  )
    return "bounce" as const;
  if (
    /\b(?:out of (?:the )?office|on (?:annual )?leave|on vacation|abwesenheitsnotiz|fuera de la oficina|absence du bureau)\b/i.test(
      text,
    ) &&
    /auto-(?:replied|generated)/i.test(mail.headers["auto-submitted"] ?? "")
  )
    return "ooo" as const;
  if (
    /auto-(?:replied|generated)/i.test(mail.headers["auto-submitted"] ?? "") ||
    /mailer-daemon|postmaster/i.test(mail.headers["from"] ?? "")
  )
    return "review" as const;
  return "reply" as const;
};
