// Optionale Abo-Funktion: liefert den Kalender als .ics, damit Apple Kalender,
// Google Kalender oder TimeTree ihn abonnieren können (nur lesen).
// Aufruf: https://<projekt>.supabase.co/functions/v1/ics?k=<schlüssel-aus-dem-einladungslink>
// Beim Anlegen im Supabase-Dashboard "Verify JWT" ausschalten, sonst lehnen Kalender-Apps ab.

const NAMES: Record<string, string> = {
  a: Deno.env.get("NAME1") ?? "Leon",
  b: Deno.env.get("NAME2") ?? "Person 2",
  g: "Gemeinsam",
};
const DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const esc = (t: string) => String(t ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const local = (s: string) => s.replace(/[-:]/g, "") + (s.length === 16 ? "00" : "");
const fold = (l: string) => { const o: string[] = []; while (l.length > 74) { o.push(l.slice(0, 74)); l = " " + l.slice(74); } o.push(l); return o.join("\r\n"); };
const nextDay = (d: string) => { const [y, m, dd] = d.split("-").map(Number); const x = new Date(Date.UTC(y, m - 1, dd + 1)); return x.toISOString().slice(0, 10).replace(/-/g, ""); };

Deno.serve(async (req) => {
  const k = new URL(req.url).searchParams.get("k") ?? "";
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(k)) return new Response("Ungültiger Link", { status: 400 });
  const url = Deno.env.get("SUPABASE_URL")!;
  // Neuer Schlüssel (Secret "PUBLISHABLE_KEY" selbst anlegen) oder der alte anon-Schlüssel, den Supabase noch mitliefert
  const key = Deno.env.get("PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
  const res = await fetch(url + "/rest/v1/rpc/list_events", {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json", apikey: key }, key.startsWith("eyJ") ? { Authorization: "Bearer " + key } : {}),
    body: JSON.stringify({ p_space: k }),
  });
  if (!res.ok) return new Response("Fehler beim Laden", { status: 502 });
  const rows: { data: any }[] = await res.json();
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Unser Kalender//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:" + esc(Deno.env.get("CAL_NAME") ?? "Unser Kalender"), "X-WR-TIMEZONE:Europe/Berlin", "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "BEGIN:VTIMEZONE", "TZID:Europe/Berlin", "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:MESZ", "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT", "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:MEZ",
    "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE"];
  for (const { data: e } of rows) {
    const who = NAMES[e.owner] ?? "";
    L.push("BEGIN:VEVENT", "UID:" + e.id + "@unser-kalender", "DTSTAMP:" + stamp, "SUMMARY:" + esc((e.owner === "g" ? "" : who + ": ") + e.title));
    if (e.allDay) L.push("DTSTART;VALUE=DATE:" + e.start.replace(/-/g, ""), "DTEND;VALUE=DATE:" + nextDay(e.end || e.start));
    else L.push("DTSTART;TZID=Europe/Berlin:" + local(e.start), "DTEND;TZID=Europe/Berlin:" + local(e.end || e.start));
    if (e.location) L.push("LOCATION:" + esc(e.location));
    if (e.notes) L.push("DESCRIPTION:" + esc(e.notes));
    L.push("CATEGORIES:" + esc(who));
    if (e.rrule) {
      let r = "RRULE:FREQ=" + e.rrule.freq + ";INTERVAL=" + (e.rrule.interval || 1);
      if (e.rrule.freq === "WEEKLY" && e.rrule.byday?.length) r += ";BYDAY=" + e.rrule.byday.map((i: number) => DAYS[i]).join(",");
      if (e.rrule.until) r += ";UNTIL=" + e.rrule.until.replace(/-/g, "") + (e.allDay ? "" : "T235959");
      else if (e.rrule.count) r += ";COUNT=" + e.rrule.count;
      L.push(r);
      for (const x of e.exdates ?? []) {
        L.push(e.allDay ? "EXDATE;VALUE=DATE:" + x.replace(/-/g, "") : "EXDATE;TZID=Europe/Berlin:" + x.replace(/-/g, "") + "T" + e.start.slice(11, 16).replace(":", "") + "00");
      }
    }
    if (e.reminder) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(e.title), "TRIGGER:-PT" + e.reminder + "M", "END:VALARM");
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return new Response(L.map(fold).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "max-age=300" },
  });
});
