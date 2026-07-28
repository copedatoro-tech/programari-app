const fs = require("fs");
const path = require("path");

const root = "D:\\programari";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, "utf8");
}

function replaceOnce(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Could not find expected block: ${label}`);
  }
  return content.replace(search, replacement);
}

function addAfter(content, search, insertion, label) {
  if (!content.includes(search)) {
    throw new Error(`Could not find expected insertion point: ${label}`);
  }
  return content.replace(search, search + insertion);
}

// ── 1. Profile page: save business address ──────────────────────────────────
{
  const rel = "app\\[locale]\\profil\\page.tsx";
  let s = read(rel);

  s = addAfter(
    s,
    '  const [telefon, setTelefon] = useState("");\n',
    '  const [businessAddress, setBusinessAddress] = useState("");\n',
    "profile state businessAddress"
  );

  s = addAfter(
    s,
    '          setTelefon("0700000000");\n',
    '          setBusinessAddress("Strada Exemplu 10, Bucuresti");\n',
    "demo businessAddress"
  );

  s = addAfter(
    s,
    '          setTelefon(profile?.phone || u.user_metadata?.phone || "");\n',
    '          setBusinessAddress(profile?.business_address || "");\n',
    "load businessAddress"
  );

  s = addAfter(
    s,
    '          phone: telefon,\n',
    '          business_address: businessAddress.trim() || null,\n',
    "save businessAddress"
  );

  s = replaceOnce(
    s,
    `            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 italic flex items-center gap-2">
                {t("roleLabel")}
              </label>
              <input
                type="text"
                value={functie}
                onChange={!isDemo ? (e) => setFunctie(e.target.value) : undefined}
                readOnly={isDemo}
                className={\`w-full p-6 rounded-[25px] font-bold text-sm outline-none transition-all \${!isDemo ? 'bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white' : 'bg-slate-100 text-slate-600 italic'}\`}
              />
            </div>
          </div>`,
    `            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 italic flex items-center gap-2">
                {t("roleLabel")}
              </label>
              <input
                type="text"
                value={functie}
                onChange={!isDemo ? (e) => setFunctie(e.target.value) : undefined}
                readOnly={isDemo}
                className={\`w-full p-6 rounded-[25px] font-bold text-sm outline-none transition-all \${!isDemo ? 'bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white' : 'bg-slate-100 text-slate-600 italic'}\`}
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 italic flex items-center gap-2">
                {t("businessAddressLabel")}
              </label>
              <textarea
                rows={2}
                value={businessAddress}
                onChange={!isDemo ? (e) => setBusinessAddress(e.target.value) : undefined}
                readOnly={isDemo}
                placeholder={t("businessAddressPlaceholder")}
                className={\`w-full p-6 rounded-[25px] font-bold text-sm outline-none transition-all resize-none \${!isDemo ? 'bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white' : 'bg-slate-100 text-slate-600 italic'}\`}
              />
              <p className="text-[10px] text-slate-400 font-bold italic ml-4">
                {t("businessAddressHint")}
              </p>
            </div>
          </div>`,
    "profile address field"
  );

  write(rel, s);
}

// ── 2. Public booking page: show address + Google Maps link ─────────────────
{
  const rel = "app\\[locale]\\rezervare\\[slug]\\page.tsx";
  let s = read(rel);

  s = replaceOnce(
    s,
    "interface AdminProfile { full_name: string | null; avatar_url: string | null; phone: string | null; email: string | null }",
    "interface AdminProfile { full_name: string | null; avatar_url: string | null; phone: string | null; email: string | null; business_address: string | null }",
    "AdminProfile business_address"
  );

  s = addAfter(
    s,
    `function toWaLink(phone: string): string {
  const digits = phone.replace(/\\D/g, "");
  const normalized = digits.startsWith("0") ? "4" + digits : digits;
  return \`https://wa.me/\${normalized}\`;
}
`,
    `function toMapsLink(address: string): string {
  return \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(address)}\`;
}
`,
    "toMapsLink helper"
  );

  s = replaceOnce(
    s,
    'profiles_public").select("working_hours, manual_blocks, has_stripe_account, stripe_onboarded, currency, require_payment_at_booking, slug, avatar_url, full_name, phone, email").eq("id", adminId).single()',
    'profiles_public").select("working_hours, manual_blocks, has_stripe_account, stripe_onboarded, currency, require_payment_at_booking, slug, avatar_url, full_name, phone, email, business_address").eq("id", adminId).single()',
    "profiles_public select address"
  );

  s = addAfter(
    s,
    "          email: profileRes.data.email || null,\n",
    "          business_address: profileRes.data.business_address || null,\n",
    "set adminProfile address"
  );

  s = replaceOnce(
    s,
    "{(adminProfile?.phone || adminProfile?.email) && (",
    "{(adminProfile?.phone || adminProfile?.email || adminProfile?.business_address) && (",
    "contact condition address"
  );

  s = addAfter(
    s,
    `                    {adminProfile?.email && (
                      <a href={\`mailto:\${adminProfile.email}\`} className="px-4 py-2 bg-white/10 hover:bg-amber-500 hover:text-slate-900 rounded-full text-[10px] font-black uppercase italic transition-colors">{adminProfile.email}</a>
                    )}
`,
    `                    {adminProfile?.business_address && (
                      <a href={toMapsLink(adminProfile.business_address)} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/10 hover:bg-sky-500 hover:text-white rounded-full text-[10px] font-black uppercase italic transition-colors flex items-center gap-1.5 max-w-full">
                        <span>📍</span> <span className="truncate">{adminProfile.business_address}</span>
                      </a>
                    )}
`,
    "public booking address chip"
  );

  write(rel, s);
}

// ── 3. Confirmation email: include address + Maps link ──────────────────────
{
  const rel = "app\\api\\send\\route.ts";
  let s = read(rel);

  s = replaceOnce(
    s,
    '        .select("phone")',
    '        .select("phone, business_address")',
    "send profile select address"
  );

  s = replaceOnce(
    s,
    '    let responsiblePhone = "";',
    '    let responsiblePhone = "";\n    let businessAddress = "";',
    "send address variable"
  );

  s = addAfter(
    s,
    '      responsiblePhone = profile?.phone || "";\n',
    '      businessAddress = profile?.business_address || "";\n',
    "send load address"
  );

  s = addAfter(
    s,
    '    const safeResponsiblePhone = escapeHtml(responsiblePhone);\n',
    '    const safeBusinessAddress = escapeHtml(businessAddress);\n    const mapsUrl = businessAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessAddress)}` : "";\n',
    "send safe address"
  );

  s = addAfter(
    s,
    `            <p style="font-size: 13px; font-weight: 600; font-style: italic; color: #475569; margin-bottom: 0;">VÄƒ aÈ™teptÄƒm cu drag!</p>
`,
    `            \${safeBusinessAddress ? \`
            <div style="margin-top: 22px; padding: 16px; background-color: #eff6ff; border-radius: 16px; border: 1px solid #bfdbfe;">
              <p style="margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.08em;">LocaÈ›ie</p>
              <p style="margin: 6px 0 12px 0; font-size: 13px; line-height: 1.5; color: #334155;"><strong style="color:#0f172a;">\${safeBusinessAddress}</strong></p>
              <a href="\${mapsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; text-decoration: none;">Deschide Ã®n Google Maps</a>
            </div>
            \` : ""}
`,
    "send email location block"
  );

  write(rel, s);
}

// ── 4. Tomorrow reminder email: include address + Maps link ─────────────────
{
  const rel = "app\\api\\reminders\\route.ts";
  let s = read(rel);

  s = replaceOnce(
    s,
    "function buildReminderHtml(nume: string, data: string, ora: string, appointmentId: string, serviciu?: string) {",
    "function buildReminderHtml(nume: string, data: string, ora: string, appointmentId: string, serviciu?: string, businessAddress?: string) {",
    "reminder signature address"
  );

  s = addAfter(
    s,
    '  const manageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/gestioneaza/${appointmentId}`;\n',
    '  const safeAddress = businessAddress ? escapeHtml(businessAddress) : "";\n  const mapsUrl = businessAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessAddress)}` : "";\n',
    "reminder maps vars"
  );

  s = addAfter(
    s,
    `        <p style="font-size: 13px; font-weight: 600; font-style: italic; color: #475569; margin-bottom: 0;">Te aÈ™teptÄƒm cu drag!</p>
`,
    `        \${safeAddress ? \`
        <div style="margin-top: 22px; padding: 16px; background-color: #eff6ff; border-radius: 16px; border: 1px solid #bfdbfe;">
          <p style="margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.08em;">LocaÈ›ie</p>
          <p style="margin: 6px 0 12px 0; font-size: 13px; line-height: 1.5; color: #334155;"><strong style="color:#0f172a;">\${safeAddress}</strong></p>
          <a href="\${mapsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; text-decoration: none;">Deschide Ã®n Google Maps</a>
        </div>
        \` : ""}
`,
    "reminder email location block"
  );

  s = replaceOnce(
    s,
    '.select("id, plan_type")',
    '.select("id, plan_type, business_address")',
    "reminder profile select address"
  );

  s = addAfter(
    s,
    '  const planByUser: Record<string, string> = {};\n',
    '  const addressByUser: Record<string, string> = {};\n',
    "reminder address map"
  );

  s = replaceOnce(
    s,
    '(profiles || []).forEach((p) => { planByUser[p.id] = (p.plan_type || "").toUpperCase(); });',
    '(profiles || []).forEach((p) => { planByUser[p.id] = (p.plan_type || "").toUpperCase(); addressByUser[p.id] = p.business_address || ""; });',
    "reminder fill address map"
  );

  s = replaceOnce(
    s,
    'html: buildReminderHtml(clientName, appt.date, appt.time, appt.id),',
    'html: buildReminderHtml(clientName, appt.date, appt.time, appt.id, undefined, addressByUser[appt.user_id] || ""),',
    "reminder call address"
  );

  write(rel, s);
}

// ── 5. Two-hour reminder email: include address + Maps link ─────────────────
{
  const rel = "app\\api\\reminders-2h\\route.ts";
  let s = read(rel);

  s = replaceOnce(
    s,
    '.select("id, plan_type, reminder_2h_enabled, full_name")',
    '.select("id, plan_type, reminder_2h_enabled, full_name, business_address")',
    "2h profile select address"
  );

  s = addAfter(
    s,
    '    const safeSalon = escapeHtml(profile.full_name || "Chronos");\n',
    '    const safeAddress = profile.business_address ? escapeHtml(profile.business_address) : "";\n    const mapsUrl = profile.business_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.business_address)}` : "";\n',
    "2h maps vars"
  );

  s = addAfter(
    s,
    `              <p style="font-size: 13px; font-weight: 600; font-style: italic; color: #475569; margin-bottom: 0;">Te aÈ™teptÄƒm!</p>
`,
    `              \${safeAddress ? \`
              <div style="margin-top: 22px; padding: 16px; background-color: #eff6ff; border-radius: 16px; border: 1px solid #bfdbfe;">
                <p style="margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.08em;">LocaÈ›ie</p>
                <p style="margin: 6px 0 12px 0; font-size: 13px; line-height: 1.5; color: #334155;"><strong style="color:#0f172a;">\${safeAddress}</strong></p>
                <a href="\${mapsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; text-decoration: none;">Deschide Ã®n Google Maps</a>
              </div>
              \` : ""}
`,
    "2h email location block"
  );

  write(rel, s);
}

// ── 6. Calendar WhatsApp manual message: add address + use textarea ─────────
{
  const rel = "app\\[locale]\\programari\\calendar\\page.tsx";
  let s = read(rel);

  s = replaceOnce(
    s,
    'queryFn:async()=>{const{data}=await supabase.from("profiles").select("plan_type,trial_started_at,manual_blocks,working_hours,notification_settings").eq("id",userId!).single();return data;},',
    'queryFn:async()=>{const{data}=await supabase.from("profiles").select("plan_type,trial_started_at,manual_blocks,working_hours,notification_settings,business_address").eq("id",userId!).single();return data;},',
    "calendar profile select address"
  );

  s = replaceOnce(
    s,
    'useEffect(()=>{if(!editForm)return;const sn=rawServices.find(s=>s.id===editForm.serviciuId)?.nume_serviciu;const base=t("editModal.whatsappMessageBase",{nume:editForm.nume,data:editForm.data,ora:editForm.ora});const suffix=sn?t("editModal.whatsappMessageServiceSuffix",{serviciu:sn}):"";setCustomMsg(`${base}${suffix}.`);},[editForm?.id]);',
    'useEffect(()=>{if(!editForm)return;const sn=rawServices.find(s=>s.id===editForm.serviciuId)?.nume_serviciu;const base=t("editModal.whatsappMessageBase",{nume:editForm.nume,data:editForm.data,ora:editForm.ora});const suffix=sn?t("editModal.whatsappMessageServiceSuffix",{serviciu:sn}):"";const address=profile?.business_address||"";const maps=address?`\\nLocatie: ${address}\\nGoogle Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`:"";setCustomMsg(`${base}${suffix}.${maps}`);},[editForm?.id,profile?.business_address,rawServices]);',
    "calendar whatsapp message address"
  );

  s = replaceOnce(
    s,
    `<input style={{width:"100%",background:"transparent",border:"none",fontSize:10,fontWeight:600,color:hasWA?"#334155":"#94a3b8",outline:"none",cursor:hasWA?"text":"not-allowed"}}
                        value={hasWA?customMsg:t("editModal.whatsappUnavailable")}
                        onChange={e=>{if(hasWA)setCustomMsg(e.target.value);}}
                        readOnly={!hasWA}/>`,
    `<textarea style={{width:"100%",background:"transparent",border:"none",fontSize:10,fontWeight:600,color:hasWA?"#334155":"#94a3b8",outline:"none",cursor:hasWA?"text":"not-allowed",resize:"vertical",minHeight:58}}
                        value={hasWA?customMsg:t("editModal.whatsappUnavailable")}
                        onChange={e=>{if(hasWA)setCustomMsg(e.target.value);}}
                        readOnly={!hasWA}/>`,
    "calendar whatsapp textarea"
  );

  write(rel, s);
}

// ── 7. Legacy calendar WhatsApp message ─────────────────────────────────────
{
  const rel = "app\\[locale]\\programari\\calendar\\Calendar.tsx";
  let s = read(rel);

  s = addAfter(
    s,
    '  const [mesajWhatsApp, setMesajWhatsApp] = useState("");\n',
    '  const [businessAddress, setBusinessAddress] = useState("");\n',
    "legacy calendar address state"
  );

  s = addAfter(
    s,
    `  // ActualizÄƒm mesajul automat cÃ¢nd selectÄƒm o programare
`,
    `  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      supabase.from("profiles").select("business_address").eq("id", userId).maybeSingle()
        .then(({ data: profile }) => setBusinessAddress(profile?.business_address || ""));
    });
  }, []);

`,
    "legacy calendar load address"
  );

  s = replaceOnce(
    s,
    '      setMesajWhatsApp(`BunÄƒ ziua, ${selectedProg.nume}! VÄƒ confirmÄƒm programarea din data de ${selectedProg.data}, ora ${selectedProg.ora}. VÄƒ aÈ™teptÄƒm!`);',
    '      const maps = businessAddress ? `\\nLocaÈ›ie: ${businessAddress}\\nGoogle Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessAddress)}` : "";\n      setMesajWhatsApp(`BunÄƒ ziua, ${selectedProg.nume}! VÄƒ confirmÄƒm programarea din data de ${selectedProg.data}, ora ${selectedProg.ora}. VÄƒ aÈ™teptÄƒm!${maps}`);',
    "legacy calendar whatsapp address"
  );

  s = replaceOnce(
    s,
    '  }, [selectedProg]);',
    '  }, [selectedProg, businessAddress]);',
    "legacy calendar effect deps"
  );

  write(rel, s);
}

// ── 8. Translations ─────────────────────────────────────────────────────────
const translations = {
  ro: {
    businessAddressLabel: "📍 Adresa locației",
    businessAddressPlaceholder: "Strada, număr, oraș",
    businessAddressHint: "Această adresă apare pe pagina publică de rezervare și în emailurile trimise clienților.",
    locationLabel: "Locație",
    openMapsBtn: "Deschide în Google Maps",
  },
  en: {
    businessAddressLabel: "📍 Business location",
    businessAddressPlaceholder: "Street, number, city",
    businessAddressHint: "This address is shown on the public booking page and in client emails.",
    locationLabel: "Location",
    openMapsBtn: "Open in Google Maps",
  },
  de: {
    businessAddressLabel: "📍 Geschäftsadresse",
    businessAddressPlaceholder: "Straße, Nummer, Stadt",
    businessAddressHint: "Diese Adresse erscheint auf der öffentlichen Buchungsseite und in Kunden-E-Mails.",
    locationLabel: "Standort",
    openMapsBtn: "In Google Maps öffnen",
  },
  es: {
    businessAddressLabel: "📍 Dirección del negocio",
    businessAddressPlaceholder: "Calle, número, ciudad",
    businessAddressHint: "Esta dirección aparece en la página pública de reservas y en los emails para clientes.",
    locationLabel: "Ubicación",
    openMapsBtn: "Abrir en Google Maps",
  },
  fr: {
    businessAddressLabel: "📍 Adresse du lieu",
    businessAddressPlaceholder: "Rue, numéro, ville",
    businessAddressHint: "Cette adresse s'affiche sur la page publique de réservation et dans les emails clients.",
    locationLabel: "Lieu",
    openMapsBtn: "Ouvrir dans Google Maps",
  },
  hu: {
    businessAddressLabel: "📍 Üzleti cím",
    businessAddressPlaceholder: "Utca, házszám, város",
    businessAddressHint: "Ez a cím megjelenik a nyilvános foglalási oldalon és az ügyfél e-mailjeiben.",
    locationLabel: "Helyszín",
    openMapsBtn: "Megnyitás Google Mapsben",
  },
  it: {
    businessAddressLabel: "📍 Indirizzo attività",
    businessAddressPlaceholder: "Via, numero, città",
    businessAddressHint: "Questo indirizzo appare nella pagina pubblica di prenotazione e nelle email ai clienti.",
    locationLabel: "Posizione",
    openMapsBtn: "Apri in Google Maps",
  },
  pl: {
    businessAddressLabel: "📍 Adres firmy",
    businessAddressPlaceholder: "Ulica, numer, miasto",
    businessAddressHint: "Ten adres pojawia się na publicznej stronie rezerwacji i w e-mailach do klientów.",
    locationLabel: "Lokalizacja",
    openMapsBtn: "Otwórz w Google Maps",
  },
  pt: {
    businessAddressLabel: "📍 Morada do negócio",
    businessAddressPlaceholder: "Rua, número, cidade",
    businessAddressHint: "Esta morada aparece na página pública de marcações e nos emails dos clientes.",
    locationLabel: "Localização",
    openMapsBtn: "Abrir no Google Maps",
  },
};

for (const [locale, values] of Object.entries(translations)) {
  const rel = `messages\\${locale}.json`;
  const data = JSON.parse(read(rel));
  data.profil = { ...data.profil, ...{
    businessAddressLabel: values.businessAddressLabel,
    businessAddressPlaceholder: values.businessAddressPlaceholder,
    businessAddressHint: values.businessAddressHint,
  }};
  data.rezervare = { ...data.rezervare, ...{
    locationLabel: values.locationLabel,
    openMapsBtn: values.openMapsBtn,
  }};
  write(rel, JSON.stringify(data, null, 2) + "\n");
}

// ── 9. SQL helper ───────────────────────────────────────────────────────────
const sql = `alter table public.profiles
add column if not exists business_address text;

comment on column public.profiles.business_address is 'Physical business address shown on public booking pages and client notifications.';

create or replace view public.profiles_public as
select
  id,
  full_name,
  phone,
  email,
  avatar_url,
  slug,
  working_hours,
  manual_blocks,
  has_stripe_account,
  stripe_onboarded,
  currency,
  require_payment_at_booking,
  business_address
from public.profiles
where slug is not null;
`;

write("supabase-add-business-address.sql", sql);

console.log("Chronos business address changes applied.");
console.log("SQL created: D:\\\\programari\\\\supabase-add-business-address.sql");
