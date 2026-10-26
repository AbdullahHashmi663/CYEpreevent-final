import "server-only";
import { partnerRequest } from "./partner";

export interface CompetitionRegistrationRow {
  id: number; registeredAt: string; competition: string; teamName: string | null;
  teamSize: number; level: string; fee: string; status: string; paymentStatus: string;
  paymentSlipUploaded: boolean; submittedVia: string;
  members: { name: string; email: string; phone: string; institution: string; gender: string; isTeamLead: boolean }[];
}

export async function allCompetitionRegistrations(name: string): Promise<CompetitionRegistrationRow[]> {
  const started = Date.now();
  async function pageData(page: number) {
    if (Date.now() - started > 210_000) throw Error("Export took too long. Please try again.");
    const res = await partnerRequest(`/registrations?competition=${encodeURIComponent(name)}&page=${page}&pageSize=100`);
    if (!res.ok) throw Error("The CYE registration service is unavailable. Please try the download again.");
    const data = await res.json();
    if (!Number.isSafeInteger(data.total) || data.total < 0 || !Array.isArray(data.registrations) || data.registrations.length > 100) throw Error("CYE returned an invalid registration list. Please try again.");
    if (data.total > 5000) throw Error("This competition exceeds the current export limit of 5,000 registrations. Contact the website administrator for a full export.");
    return data as { total: number; registrations: CompetitionRegistrationRow[] };
  }
  const first = await pageData(1);
  const total = first.total;
  const rows = new Map<number, CompetitionRegistrationRow>();
  function append(data: typeof first, page: number) {
    if (data.total !== total) throw Error("Registrations changed during the download. Please try again to get a complete file.");
    if (data.registrations.length !== Math.min(100, Math.max(0, total - (page - 1) * 100))) throw Error("CYE returned an incomplete registration list. Please try again.");
    for (const row of data.registrations) {
      if (!Number.isSafeInteger(row.id) || rows.has(row.id) || row.competition !== name || !Array.isArray(row.members)) throw Error("The registration list changed or is incomplete. Please try again.");
      rows.set(row.id, row);
    }
  }
  append(first, 1);
  // Bounded parallel GETs remove long serial waterfalls without flooding the partner service.
  const pages = Math.ceil(total / 100);
  for (let page = 2; page <= pages; page += 3) {
    const numbers = Array.from({ length: Math.min(3, pages - page + 1) }, (_, i) => page + i);
    const batch = await Promise.allSettled(numbers.map(pageData));
    for (let i = 0; i < batch.length; i++) {
      const result = batch[i];
      if (result.status === "rejected") throw result.reason;
      append(result.value, numbers[i]);
    }
  }
  if (rows.size !== total) throw Error("The registration list could not be downloaded completely. Please try again.");
  return [...rows.values()];
}

export async function competitionWorkbook(name: string, registrations: CompetitionRegistrationRow[], languages: Map<string, string>, speech: boolean) {
  // Avoid parsing the spreadsheet engine until the upstream list is ready to export.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Capital Youth Expo pre-event BUIC";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Registrations");
  const participants = workbook.addWorksheet("Participants");
  sheet.columns = [
    { header: "CYE reference", key: "reference", width: 16 },
    { header: "Competition", key: "competition", width: 30 },
    { header: "Team name", key: "team", width: 26 },
    { header: "Team size", key: "size", width: 12 },
    { header: "Members shared by CYE", key: "shared", width: 24 },
    { header: "Education level", key: "level", width: 30 },
    { header: "Fee", key: "fee", width: 18 },
    { header: "Status", key: "status", width: 18 },
    { header: "Payment status", key: "payment", width: 20 },
    { header: "Receipt uploaded", key: "receipt", width: 18 },
    ...(speech ? [{ header: "Speech language", key: "language", width: 20 }] : []),
    { header: "Registered at (Pakistan)", key: "date", width: 28 },
    { header: "Submitted via", key: "via", width: 20 },
  ];
  participants.columns = [
    { header: "CYE reference", key: "reference", width: 16 },
    { header: "Competition", key: "competition", width: 30 },
    { header: "Team name", key: "team", width: 26 },
    { header: "Name", key: "name", width: 30 },
    { header: "Email", key: "email", width: 40 },
    { header: "Phone / WhatsApp", key: "phone", width: 24 },
    { header: "Institution", key: "institution", width: 40 },
    { header: "Gender", key: "gender", width: 14 },
    { header: "Team lead", key: "lead", width: 14 },
    ...(speech ? [{ header: "Speech language", key: "language", width: 20 }] : []),
  ];
  // Plain string cells preserve phone prefixes and never interpret user input as formulas.
  const text = (v: unknown) => typeof v === "string" ? v.slice(0, 32767) : "";
  for (const row of registrations) {
    const language = speech ? languages.get(String(row.id)) || "Not recorded" : "";
    sheet.addRow({ reference: row.id, competition: name, team: text(row.teamName), size: row.teamSize, shared: row.members.length, level: text(row.level), fee: text(row.fee), status: text(row.status), payment: text(row.paymentStatus), receipt: row.paymentSlipUploaded ? "Yes" : "No", language,
      date: new Date(row.registeredAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi", hour12: false }), via: text(row.submittedVia) });
    for (const member of row.members) participants.addRow({ reference: row.id, competition: name, team: text(row.teamName), name: text(member.name), email: text(member.email), phone: text(member.phone), institution: text(member.institution), gender: text(member.gender), lead: member.isTeamLead ? "Yes" : "No", language });
  }
  for (const ws of [sheet, participants]) {
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, ws.rowCount), column: ws.columnCount } };
    ws.getRow(1).height = 30;
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4594" } };
    ws.eachRow((row, index) => {
      row.alignment = { vertical: "middle", wrapText: true };
      if (index > 1 && index % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F5FF" } };
    });
  }
  sheet.getCell("E1").note = "CYE may share only Bahria members for registrations made on its own website. Team size can exceed the number of shared participants. Student IDs and receipt images are not available through this API.";
  if (speech) sheet.getCell("K1").note = "Language is recorded by this website for new Speech registrations. Earlier entries and entries made elsewhere may show Not recorded.";
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
