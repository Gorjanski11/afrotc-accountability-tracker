import type { RosterPerson } from "./types";

/**
 * Individually authorized emails, on top of the automatic TRG/CWL/Cadre rule below -- e.g. Group
 * Commanders for OG/MSG/WSG, who aren't otherwise distinguishable from a regular group member in
 * the roster (no "position"/title data is tracked yet). Add an email here and redeploy to grant
 * someone access without needing to change their roster group.
 */
export const ALWAYS_AUTHORIZED_EMAILS = ["jorge.cortes4@upr.edu"];

/**
 * Who may sign into this cadre-only site: anyone individually listed above, plus anyone whose
 * roster record is flagged Cadre or is in the TRG or CWL group (staff/leadership groups -- every
 * member has access, not just the commander). A regular OG/MSG/WSG member does NOT get in just by
 * being in that group.
 */
export function isAuthorizedStaff(email: string | null | undefined, roster: RosterPerson[]): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (ALWAYS_AUTHORIZED_EMAILS.includes(normalized)) return true;
  const match = roster.find((p) => p.email?.trim().toLowerCase() === normalized);
  if (!match) return false;
  return match.isCadre === true || match.group === "TRG" || match.group === "CWL";
}
