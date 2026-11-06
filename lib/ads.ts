export type StorefrontAd = {
  id: string; title: string; message: string; kind: "text" | "image" | "instagram";
  enabled: boolean; starts_at: string | null; ends_at: string | null; sort_order: number;
  desktop_image_url: string | null; mobile_image_url: string | null;
  alt_text: string; link_url: string | null; cta_label: string;
  created_at: string; updated_at: string;
};

export type PublicAd = Pick<StorefrontAd,"id"|"title"|"message"|"kind"|"desktop_image_url"|"mobile_image_url"|"alt_text"|"link_url"|"cta_label"|"ends_at">;

export function validateAd(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid ad.");
  const row = value as Record<string, unknown>;
  const text = (name: string, limit: number, required = false) => {
    if (typeof row[name] !== "string") throw new Error(`Invalid ${name}.`);
    const result = (row[name] as string).trim();
    if (result.length > limit || (required && !result)) throw new Error(`Check ${name} (maximum ${limit} characters).`);
    return result;
  };
  const url = (name: string) => {
    if (row[name] === null || row[name] === "") return null;
    const result = text(name, 2048);
    try { const parsed = new URL(result); if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(); }
    catch { throw new Error(`Use a full http/https URL for ${name}.`); }
    return result;
  };
  const date = (name: string) => {
    if (row[name] === null || row[name] === "") return null;
    if (typeof row[name] !== "string" || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(row[name] as string) || !Number.isFinite(Date.parse(row[name] as string))) throw new Error(`Invalid ${name}.`);
    return new Date(row[name] as string).toISOString();
  };
  const kind = text("kind", 20);
  if (!["text", "image", "instagram"].includes(kind) || typeof row.enabled !== "boolean") throw new Error("Invalid format or enabled setting.");
  const order = row.sort_order;
  if (!Number.isInteger(order) || Number(order) < 0 || Number(order) > 10000) throw new Error("Display order must be 0–10000.");
  const result = {title: text("title",100,true), message:text("message",300),kind,enabled:row.enabled,
    sort_order:Number(order),starts_at:date("starts_at"),ends_at:date("ends_at"),
    desktop_image_url:url("desktop_image_url"),mobile_image_url:url("mobile_image_url"),
    alt_text:text("alt_text",300),link_url:url("link_url"),cta_label:text("cta_label",60)};
  if (result.starts_at && result.ends_at && result.ends_at <= result.starts_at) throw new Error("End must be after start.");
  if (result.enabled && kind === "image" && ((!result.desktop_image_url && !result.mobile_image_url) || !result.alt_text)) throw new Error("Enabled image ads need artwork and alternative text.");
  if (result.enabled && kind === "instagram" && !result.link_url) throw new Error("Add your Instagram profile URL before enabling this ad.");
  return result;
}

export function easternDay(value: string, end = false) {
  if (!value) return null;
  if (!/^\d{4}-\d\d-\d\d$/.test(value)) throw new Error("Invalid date.");
  const [y,m,d]=value.split("-").map(Number);
  const base=Date.UTC(y,m-1,d);
  if (new Date(base).toISOString().slice(0,10)!==value) throw new Error("Invalid date.");
  const target=base+(end?86400000:0);
  const format=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  let result=target;
  for(let i=0;i<3;i++) { const p=Object.fromEntries(format.formatToParts(result).map(x=>[x.type,x.value])); result+=target-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second); }
  return new Date(result).toISOString();
}

export function displayEasternDay(value: string | null, end = false) {
  if (!value) return "";
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(Date.parse(value)-(end?1:0)).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
