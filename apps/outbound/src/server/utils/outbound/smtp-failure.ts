import { z } from "zod";
import { IntegrationError } from "./http";

// Never retain the server response or command arguments: either can contain
// recipient addresses, authentication material or message contents.
const commandSchema = z.enum([
  "API",
  "CONN",
  "EHLO",
  "HELO",
  "STARTTLS",
  "AUTH",
  "AUTH PLAIN",
  "AUTH LOGIN",
  "AUTH XOAUTH2",
  "AUTH CRAM-MD5",
  "MAIL FROM",
  "RCPT TO",
  "DATA",
  "BDAT",
  "RSET",
  "QUIT",
]);
const codeSchema = z.enum([
  "EAUTH",
  "ECONNECTION",
  "ESOCKET",
  "ETIMEDOUT",
  "EDNS",
  "EENVELOPE",
  "EMESSAGE",
  "ESTREAM",
  "EPROTOCOL",
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "ETLS",
  "EREQUIRETLS",
]);
const responseCodeSchema = z.number().int().min(100).max(599);
export const smtpFailureSchema = z
  .object({
    command: commandSchema.nullable(),
    code: codeSchema.nullable(),
    responseCode: responseCodeSchema.nullable(),
  })
  .strict();
export type SmtpFailure = z.infer<typeof smtpFailureSchema>;

/** Diagnostic provenance only. It never determines delivery status or retryability. */
export const sanitizeSmtpFailure = (error: unknown): SmtpFailure | null => {
  const parsed = z
    .object({
      command: z.unknown().optional(),
      code: z.unknown().optional(),
      responseCode: z.unknown().optional(),
    })
    .safeParse(error);
  if (!parsed.success) return null;
  const command = commandSchema.safeParse(parsed.data.command);
  const code = codeSchema.safeParse(parsed.data.code);
  const responseCode = responseCodeSchema.safeParse(parsed.data.responseCode);
  const diagnostic = {
    command: command.success ? command.data : null,
    code: code.success ? code.data : null,
    responseCode: responseCode.success ? responseCode.data : null,
  };
  return Object.values(diagnostic).some((value) => value !== null)
    ? diagnostic
    : null;
};

/** Revalidate at the audit boundary; arbitrary provider receipts are not trusted. */
export const smtpFailureFrom = (error: unknown): SmtpFailure | null => {
  if (!(error instanceof IntegrationError) || error.provider !== "google")
    return null;
  const parsed = z.object({ smtp: smtpFailureSchema }).safeParse(error.receipt);
  return parsed.success ? parsed.data.smtp : null;
};
