// Lovable Cloud Function: backup-worker
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  run_id: string;
  /** optional for naming */
  schedule_type?: "manual" | "daily" | "weekly" | "monthly";
};

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function safeFilenamePart(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// NOTE: keep this as `any` to avoid edge-runtime generic type mismatches.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllRows(admin: any, table: string) {
  const pageSize = 1000;
  let from = 0;
  const out: any[] = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await admin.from(table as any).select("*").range(from, to);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return out;
}

async function getGoogleAccessToken(args: { sa: GoogleServiceAccount; scopes: string[] }) {
  const tokenUri = args.sa.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const scope = args.scopes.join(" ");

  // Service account JSON sometimes arrives with literal "\\n" sequences in env secrets.
  // jose expects a PEM string with real newlines.
  const normalizedPk = (args.sa.private_key ?? "").replace(/\\n/g, "\n");
  if (!normalizedPk.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON.private_key must be a PKCS#8 PEM string (-----BEGIN PRIVATE KEY-----). Please regenerate a JSON key from Google Service Account."
    );
  }

  const pk = await importPKCS8(normalizedPk, "RS256");
  const jwt = await new SignJWT({
    scope,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(args.sa.client_email)
    .setSubject(args.sa.client_email)
    .setAudience(tokenUri)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .sign(pk);

  const body = new URLSearchParams();
  body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  body.set("assertion", jwt);

  const resp = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`Google token request failed [${resp.status}]: ${JSON.stringify(data)}`);
  }
  const token = (data as any)?.access_token as string | undefined;
  if (!token) throw new Error("Google token response missing access_token");
  return token;
}

async function driveUploadXlsx(args: { accessToken: string; folderId: string; filename: string; bytes: Uint8Array }) {
  const boundary = `-------lovable-${crypto.randomUUID()}`;
  const metadata = {
    name: args.filename,
    parents: [args.folderId],
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  const part1 =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n`;
  const part2Header =
    `--${boundary}\r\n` +
    `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
  const end = `\r\n--${boundary}--\r\n`;

  const enc = new TextEncoder();
  const body = new Uint8Array(enc.encode(part1).length + enc.encode(part2Header).length + args.bytes.length + enc.encode(end).length);
  let offset = 0;
  body.set(enc.encode(part1), offset);
  offset += enc.encode(part1).length;
  body.set(enc.encode(part2Header), offset);
  offset += enc.encode(part2Header).length;
  body.set(args.bytes, offset);
  offset += args.bytes.length;
  body.set(enc.encode(end), offset);

  const resp = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`Google Drive upload failed [${resp.status}]: ${JSON.stringify(data)}`);
  }
  return data as { id: string; webViewLink?: string };
}

async function sheetsEnsureTab(args: { accessToken: string; spreadsheetId: string; tabName: string }) {
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${args.spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${args.accessToken}` },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`Google Sheets get spreadsheet failed [${resp.status}]: ${JSON.stringify(data)}`);
  }
  const sheets: any[] = (data as any)?.sheets ?? [];
  const exists = sheets.some((s) => s?.properties?.title === args.tabName);
  if (exists) return;

  const createResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${args.spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: args.tabName } } }],
    }),
  });
  const createData = await createResp.json().catch(() => ({}));
  if (!createResp.ok) {
    throw new Error(`Google Sheets create tab failed [${createResp.status}]: ${JSON.stringify(createData)}`);
  }
}

async function sheetsAppendBackupRow(args: {
  accessToken: string;
  spreadsheetId: string;
  tabName: string;
  values: (string | number | null)[];
}) {
  const range = encodeURIComponent(`${args.tabName}!A1`);
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${args.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [args.values] }),
    },
  );
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`Google Sheets append failed [${resp.status}]: ${JSON.stringify(data)}`);
  }
}

type BackupTargets = {
  /** always on */
  storage?: boolean;
  drive?: boolean;
  sheets?: boolean;
};

// NOTE: keep this inline; no cross-file imports in edge functions.
async function getBackupTargets(admin: any): Promise<Required<BackupTargets>> {
  try {
    const { data } = await admin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "backup_settings")
      .maybeSingle();

    const targets = (data?.setting_value as any)?.targets as BackupTargets | undefined;
    return {
      storage: true,
      drive: targets?.drive !== false,
      sheets: targets?.sheets !== false,
    };
  } catch {
    return { storage: true, drive: true, sheets: true };
  }
}

async function runBackupJob(req: Request, body: Body) {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) {
    throw new Error("Server configuration error: Missing backend credentials");
  }

  const admin = createClient(url, serviceRole);
  const startedAt = new Date();
  const scheduleType = body.schedule_type ?? "manual";

  const targets = await getBackupTargets(admin);

  try {
    // Mark running
    await admin
      .from("backup_runs")
      .update({ status: "running", started_at: startedAt.toISOString() })
      .eq("id", body.run_id);

    // Tables snapshot (explicit list)
    const tables = [
      // patient/core
      "admissions",
      "discharges",
      "emergencies",
      "endoscopies",
      "procedures",
      "file_loans",
      "notes",
      // audits
      "admissions_audit",
      "deletion_audit",
      // master
      "departments",
      "doctors",
      "diagnoses",
      "governorates",
      "districts",
      "stations",
      "occupations",
      "hospitals",
      "loan_borrowers",
      "loan_reasons",
      "loan_to_departments",
      "exit_statuses",
      // users/settings
      "user_roles",
      "user_permissions",
      "user_departments",
      "app_settings",
      // backup tables themselves
      "backup_runs",
      "backup_artifacts",
    ];

    const wb = XLSX.utils.book_new();
    const totals: Record<string, number> = {};

    for (const t of tables) {
      const rows = await fetchAllRows(admin, t);
      totals[t] = rows.length;
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, t.slice(0, 31));
    }

    // Meta sheet
    const metaRows = [
      ["Backup Run ID", body.run_id],
      ["Schedule Type", scheduleType],
      ["Generated At", new Date().toISOString()],
      ["Targets", JSON.stringify(targets)],
      [],
      ["Table", "Rows"],
      ...tables.map((t) => [t, totals[t] ?? 0]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaRows), "_meta");

    const xlsxArray = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const xlsxBytes = new Uint8Array(xlsxArray);

    const ymd = startedAt.toISOString().slice(0, 10);
    const filename = `backup_${ymd}_${safeFilenamePart(scheduleType)}_${safeFilenamePart(body.run_id)}.xlsx`;
    const storagePath = `${ymd}/${body.run_id}/${filename}`;

    // Upload to internal storage (always)
    const { error: uploadErr } = await admin.storage.from("backups").upload(storagePath, xlsxBytes, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });
    if (uploadErr) throw uploadErr;

    let driveFileId: string | null = null;
    let driveWebViewLink: string | null = null;
    let driveFolderId: string | null = null;

    // Optional: Drive + Sheets
    if (targets.drive || targets.sheets) {
      const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
      if (!GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");

      const sa = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as GoogleServiceAccount;
      const accessToken = await getGoogleAccessToken({
        sa,
        scopes: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/spreadsheets"],
      });

      if (targets.drive) {
        const GOOGLE_DRIVE_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
        if (!GOOGLE_DRIVE_FOLDER_ID) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured");
        driveFolderId = GOOGLE_DRIVE_FOLDER_ID;

        const drive = await driveUploadXlsx({
          accessToken,
          folderId: GOOGLE_DRIVE_FOLDER_ID,
          filename,
          bytes: xlsxBytes,
        });
        driveFileId = drive.id;
        driveWebViewLink = drive.webViewLink ?? null;
      }

      if (targets.sheets) {
        const GOOGLE_SHEETS_SPREADSHEET_ID = Deno.env.get("GOOGLE_SHEETS_SPREADSHEET_ID");
        if (!GOOGLE_SHEETS_SPREADSHEET_ID) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not configured");

        const tabName = "Backups";
        await sheetsEnsureTab({ accessToken, spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID, tabName });
        await sheetsAppendBackupRow({
          accessToken,
          spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
          tabName,
          values: [
            startedAt.toISOString(),
            scheduleType,
            body.run_id,
            filename,
            xlsxBytes.length,
            driveFileId ?? "",
            driveWebViewLink ?? "",
          ],
        });
      }
    }

    // Record artifact (always)
    const { data: artifact, error: artErr } = await admin
      .from("backup_artifacts")
      .insert({
        run_id: body.run_id,
        artifact_type: "excel_all_tables",
        is_encrypted: false,
        mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        bytes: xlsxBytes.length,
        storage_bucket: "backups",
        storage_path: storagePath,
        drive_file_id: driveFileId,
        drive_parent_folder_id: driveFolderId,
        meta: { tables, totals, filename, targets, drive_web_view_link: driveWebViewLink },
      })
      .select("id")
      .single();
    if (artErr) throw artErr;

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    await admin
      .from("backup_runs")
      .update({ status: "success", finished_at: finishedAt.toISOString(), duration_ms: durationMs })
      .eq("id", body.run_id);

    console.log("backup-worker success", { run_id: body.run_id, durationMs, targets });
    return { ok: true, run_id: body.run_id, artifact_id: artifact?.id, storage_path: storagePath, drive_file_id: driveFileId };
  } catch (err: any) {
    console.error("backup-worker failed:", err);
    try {
      await admin
        .from("backup_runs")
        .update({ status: "failed", finished_at: new Date().toISOString(), error_message: err?.message ?? String(err) })
        .eq("id", body.run_id);
    } catch {
      // ignore
    }
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.run_id) return json({ error: "Missing run_id" }, 400);
    // Run in background: return immediately to avoid client timeouts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil as ((p: Promise<unknown>) => void) | undefined;
    if (waitUntil) {
      waitUntil(runBackupJob(req, body));
      return json({ ok: true, run_id: body.run_id, queued: true });
    }

    // Fallback (shouldn't happen in production): run inline.
    const res = await runBackupJob(req, body);
    return json(res);
  } catch (err: any) {
    return json({ error: err?.message ?? String(err) }, 500);
  }
});
