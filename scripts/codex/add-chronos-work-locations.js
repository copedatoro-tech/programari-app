const fs = require("fs");
const path = require("path");

const root = "D:\\programari";

function file(rel) {
  return path.join(root, rel);
}

function read(rel) {
  return fs.readFileSync(file(rel), "utf8").replace(/\r\n/g, "\n");
}

function write(rel, content) {
  fs.writeFileSync(file(rel), content, "utf8");
}

function replaceOnce(content, search, replacement, label) {
  if (content.includes(replacement)) {
    return content;
  }
  if (!content.includes(search)) {
    throw new Error(`Could not find expected block: ${label}`);
  }
  return content.replace(search, replacement);
}

function addAfter(content, search, insertion, label) {
  if (content.includes(insertion)) {
    return content;
  }
  if (!content.includes(search)) {
    throw new Error(`Could not find insertion point: ${label}`);
  }
  return content.replace(search, search + insertion);
}

function addAfterAll(content, search, insertion, label) {
  if (content.includes(insertion)) {
    return content;
  }
  const count = content.split(search).length - 1;
  if (count === 0) {
    throw new Error(`Could not find insertion point: ${label}`);
  }
  return content.split(search).join(search + insertion);
}

function addBefore(content, search, insertion, label) {
  if (content.includes(insertion)) {
    return content;
  }
  if (!content.includes(search)) {
    throw new Error(`Could not find insertion point: ${label}`);
  }
  return content.replace(search, insertion + search);
}

// 1) Profil: multiple work locations.
{
  const rel = "app\\[locale]\\profil\\page.tsx";
  let s = read(rel);

  s = addAfter(
    s,
    'import { Crown, Gem, ShieldCheck, Zap } from "lucide-react";\n',
    '\ntype WorkLocation = { id: string; name: string; address: string };\n',
    "profile WorkLocation type"
  );

  s = addAfter(
    s,
    '  const [telefon, setTelefon] = useState("");\n',
    '  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);\n',
    "profile workLocations state"
  );

  s = addAfter(
    s,
    '          setTelefon("0700000000");\n',
    '          setWorkLocations([{ id: "demo-1", name: "Locatia principala", address: "Strada Exemplu 10, Bucuresti" }]);\n',
    "profile demo workLocations"
  );

  s = addAfter(
    s,
    '          setTelefon(profile?.phone || u.user_metadata?.phone || "");\n',
    `          const rawLocations = Array.isArray(profile?.work_locations) ? profile.work_locations : [];
          setWorkLocations(rawLocations.map((loc: any, index: number) => ({
            id: String(loc?.id || \`loc-\${index + 1}\`),
            name: String(loc?.name || ""),
            address: String(loc?.address || ""),
          })));
`,
    "profile load workLocations"
  );

  s = addAfter(
    s,
    '          phone: telefon,\n',
    `          work_locations: workLocations
            .map((loc, index) => ({
              id: loc.id || \`loc-\${Date.now()}-\${index}\`,
              name: loc.name.trim() || \`Locatia \${index + 1}\`,
              address: loc.address.trim(),
            }))
            .filter((loc) => loc.address),
`,
    "profile save workLocations"
  );

  s = addAfter(
    s,
    `  const handleUploadAvatar = async (event: any) => {
    if (!event.target.files?.[0] || isDemo) return;
    setUpdating(true);
    try {
      const file = event.target.files[0];
      const filePath = \`avatars/\${user.id}-\${Date.now()}\`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (err: any) {
      alert(t("avatarErrorPrefix") + err.message);
    } finally {
      setUpdating(false);
    }
  };
`,
    `
  const addWorkLocation = () => {
    if (isDemo) return;
    setWorkLocations((prev) => [
      ...prev,
      { id: \`loc-\${Date.now()}\`, name: "", address: "" },
    ]);
  };

  const updateWorkLocation = (id: string, field: "name" | "address", value: string) => {
    if (isDemo) return;
    setWorkLocations((prev) => prev.map((loc) => loc.id === id ? { ...loc, [field]: value } : loc));
  };

  const removeWorkLocation = (id: string) => {
    if (isDemo) return;
    setWorkLocations((prev) => prev.filter((loc) => loc.id !== id));
  };
`,
    "profile work location helpers"
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
          </div>

          <div className="bg-slate-50 p-8 md:p-10 rounded-[40px] border-2 border-slate-100 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t("workLocationsTitle")}</p>
                <p className="text-[10px] text-slate-500 font-bold italic mt-1">{t("workLocationsHint")}</p>
              </div>
              <button
                type="button"
                onClick={addWorkLocation}
                disabled={isDemo}
                className="px-6 py-3 bg-slate-900 text-amber-500 rounded-2xl text-[10px] font-black uppercase italic hover:bg-amber-500 hover:text-slate-900 transition-all disabled:opacity-50"
              >
                {t("addWorkLocationBtn")}
              </button>
            </div>

            {workLocations.length === 0 && (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[30px] p-6 text-center">
                <p className="text-xs font-bold text-slate-400 italic">{t("noWorkLocations")}</p>
              </div>
            )}

            <div className="space-y-4">
              {workLocations.map((loc, index) => (
                <div key={loc.id} className="bg-white rounded-[30px] border-2 border-slate-100 p-5 grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-4 items-start">
                  <input
                    type="text"
                    value={loc.name}
                    onChange={(e) => updateWorkLocation(loc.id, "name", e.target.value)}
                    readOnly={isDemo}
                    placeholder={t("workLocationNamePlaceholder", { n: index + 1 })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-amber-500 outline-none text-xs font-black uppercase italic"
                  />
                  <textarea
                    rows={2}
                    value={loc.address}
                    onChange={(e) => updateWorkLocation(loc.id, "address", e.target.value)}
                    readOnly={isDemo}
                    placeholder={t("workLocationAddressPlaceholder")}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-amber-500 outline-none text-xs font-bold resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeWorkLocation(loc.id)}
                    disabled={isDemo}
                    className="px-5 py-4 bg-red-50 text-red-500 rounded-2xl text-[9px] font-black uppercase italic hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    {t("removeWorkLocationBtn")}
                  </button>
                </div>
              ))}
            </div>
          </div>`,
    "profile work locations UI"
  );

  write(rel, s);
}

// 2) Public booking page: choose work location and send it to APIs.
{
  const rel = "app\\[locale]\\rezervare\\[slug]\\page.tsx";
  let s = read(rel);

  s = addAfter(
    s,
    'interface WorkingHourEntry { day: string; start: string; end: string; closed: boolean }\n',
    'type WorkLocation = { id: string; name: string; address: string };\n',
    "booking WorkLocation type"
  );

  s = replaceOnce(
    s,
    "interface AdminProfile { full_name: string | null; avatar_url: string | null; phone: string | null; email: string | null }",
    "interface AdminProfile { full_name: string | null; avatar_url: string | null; phone: string | null; email: string | null; work_locations: WorkLocation[] }",
    "booking AdminProfile work_locations"
  );

  s = addAfter(
    s,
    `function toWaLink(phone: string): string {
  const digits = phone.replace(/\\D/g, "");
  const withCountryCode = digits.startsWith("0") ? "4" + digits : digits;
  return \`https://wa.me/\${withCountryCode}\`;
}
`,
    `function toMapsLink(address: string): string {
  return \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(address)}\`;
}
`,
    "booking toMapsLink"
  );

  s = addAfter(
    s,
    '  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);\n',
    '  const [selectedWorkLocationId, setSelectedWorkLocationId] = useState("");\n',
    "booking selectedWorkLocationId"
  );

  s = replaceOnce(
    s,
    'profiles_public").select("working_hours, manual_blocks, has_stripe_account, stripe_onboarded, currency, require_payment_at_booking, slug, avatar_url, full_name, phone, email").eq("id", adminId).single()',
    'profiles_public").select("working_hours, manual_blocks, has_stripe_account, stripe_onboarded, currency, require_payment_at_booking, slug, avatar_url, full_name, phone, email, work_locations").eq("id", adminId).single()',
    "booking profile select work_locations"
  );

  s = addAfter(
    s,
    "          email: profileRes.data.email || null,\n",
    "          work_locations: Array.isArray(profileRes.data.work_locations) ? profileRes.data.work_locations : [],\n",
    "booking set adminProfile work_locations"
  );

  s = addAfter(
    s,
    `  useEffect(() => {
    if (adminIdReady && adminId) fetchAdminConfig();
    else if (adminIdReady && !adminId) setFetchingConfig(false);
  }, [adminIdReady, adminId, fetchAdminConfig]);
`,
    `
  useEffect(() => {
    const locations = adminProfile?.work_locations || [];
    if (locations.length === 0) {
      setSelectedWorkLocationId("");
      return;
    }
    if (!selectedWorkLocationId || !locations.some((loc) => loc.id === selectedWorkLocationId)) {
      setSelectedWorkLocationId(locations[0].id);
    }
  }, [adminProfile?.work_locations, selectedWorkLocationId]);

  const selectedWorkLocation = useMemo(() => {
    const locations = adminProfile?.work_locations || [];
    return locations.find((loc) => loc.id === selectedWorkLocationId) || locations[0] || null;
  }, [adminProfile?.work_locations, selectedWorkLocationId]);
`,
    "booking selectedWorkLocation memo"
  );

  s = replaceOnce(
    s,
    '    const invalidBookings = bookings.some(b => !b.serviciu_id || b.ora === "00:00");',
    '    const invalidBookings = bookings.some(b => !b.serviciu_id || b.ora === "00:00");\n    const needsLocation = (adminProfile?.work_locations || []).length > 1 && !selectedWorkLocation;',
    "booking needsLocation"
  );

  s = replaceOnce(
    s,
    `    if (invalidBookings) {
      setPopup({ icon: "⚠️", title: t("incompleteTitle"), message: t("incompleteMsg") });
      setErrors(newErrors);
      return;
    }
`,
    `    if (invalidBookings || needsLocation) {
      setPopup({ icon: "⚠️", title: t("incompleteTitle"), message: needsLocation ? t("chooseWorkLocationMsg") : t("incompleteMsg") });
      setErrors(newErrors);
      return;
    }
`,
    "booking location validation"
  );

  s = addAfterAll(
    s,
    `              detalii: clientInfo.detalii,
            },
`,
    `            workLocation: selectedWorkLocation ? {
              id: selectedWorkLocation.id,
              name: selectedWorkLocation.name,
              address: selectedWorkLocation.address,
              mapsUrl: toMapsLink(selectedWorkLocation.address),
            } : null,
`,
    "booking API requests workLocation"
  );

  s = replaceOnce(
    s,
    `              <div className="h-px bg-slate-100 w-full"></div>

              <div className="space-y-12">`,
    `              {(adminProfile?.work_locations?.length || 0) > 0 && (
                <div className="bg-slate-50 border-2 border-slate-100 rounded-[35px] p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">{t("workLocationTitle")}</p>
                      <p className="text-xs font-bold text-slate-500 italic">{t("workLocationHint")}</p>
                    </div>
                    {selectedWorkLocation?.address && (
                      <a href={toMapsLink(selectedWorkLocation.address)} target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-amber-500 px-5 py-3 rounded-2xl text-[10px] font-black uppercase italic hover:bg-amber-500 hover:text-slate-900 transition-all">
                        {t("openMapsBtn")}
                      </a>
                    )}
                  </div>

                  {adminProfile?.work_locations.length === 1 ? (
                    <div className="bg-white rounded-[25px] border-2 border-amber-200 p-5">
                      <p className="text-sm font-black text-slate-900 uppercase italic">{adminProfile.work_locations[0].name || t("defaultWorkLocationName")}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">{adminProfile.work_locations[0].address}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {adminProfile?.work_locations.map((loc) => {
                        const selected = selectedWorkLocationId === loc.id;
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => setSelectedWorkLocationId(loc.id)}
                            className={\`text-left rounded-[25px] border-2 p-5 transition-all \${selected ? "border-amber-500 bg-amber-50 shadow-lg" : "border-slate-200 bg-white hover:border-amber-300"}\`}
                          >
                            <p className="text-sm font-black text-slate-900 uppercase italic">{loc.name || t("defaultWorkLocationName")}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{loc.address}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="h-px bg-slate-100 w-full"></div>

              <div className="space-y-12">`,
    "public booking location chooser"
  );

  write(rel, s);
}

// 3) API create-booking: validate and save chosen location.
{
  const rel = "app\\api\\create-booking\\route.ts";
  let s = read(rel);

  s = addAfter(
    s,
    `function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
`,
    `function normalizeWorkLocation(profileLocations: any, submittedLocation: any) {
  const locations = Array.isArray(profileLocations) ? profileLocations : [];
  if (locations.length === 0) return null;
  if (!submittedLocation?.id) return null;
  const match = locations.find((loc: any) => String(loc?.id) === String(submittedLocation.id));
  if (!match?.address) return null;
  const name = String(match.name || submittedLocation.name || "Locatie").trim();
  const address = String(match.address).trim();
  return {
    id: String(match.id),
    name,
    address,
    mapsUrl: \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(address)}\`,
  };
}
`,
    "create-booking normalizeWorkLocation"
  );

  s = replaceOnce(
    s,
    '    const { turnstileToken, adminId, clientInfo, bookings } = body;',
    '    const { turnstileToken, adminId, clientInfo, bookings, workLocation } = body;',
    "create-booking destructure workLocation"
  );

  s = replaceOnce(
    s,
    '.select("plan_type")',
    '.select("plan_type, work_locations")',
    "create-booking profile select work_locations"
  );

  s = addAfter(
    s,
    '    const maxAppointments = PLAN_LIMITS[plan] ?? 30;\n',
    '    const selectedWorkLocation = normalizeWorkLocation(profileData?.work_locations, workLocation);\n',
    "create-booking selectedWorkLocation"
  );

  s = addAfter(
    s,
    '        is_client_booking: true,\n',
    '        work_location_id: selectedWorkLocation?.id || null,\n        work_location_name: selectedWorkLocation?.name || null,\n        work_location_address: selectedWorkLocation?.address || null,\n        work_location_maps_url: selectedWorkLocation?.mapsUrl || null,\n',
    "create-booking payload work location"
  );

  write(rel, s);
}

// 4) Stripe checkout: preserve selected location through metadata.
{
  const rel = "app\\api\\stripe\\create-booking-checkout\\route.ts";
  let s = read(rel);

  s = replaceOnce(
    s,
    '    const { adminId, clientInfo, bookings } = body;',
    '    const { adminId, clientInfo, bookings, workLocation } = body;',
    "stripe checkout destructure workLocation"
  );

  s = replaceOnce(
    s,
    '.select("stripe_account_id, stripe_onboarded, currency, require_payment_at_booking, deposit_percent, slug")',
    '.select("stripe_account_id, stripe_onboarded, currency, require_payment_at_booking, deposit_percent, slug, work_locations")',
    "stripe checkout profile select work_locations"
  );

  s = addAfter(
    s,
    '    const currency = (profile.currency || "RON").toLowerCase();\n',
    `    const profileLocations = Array.isArray(profile.work_locations) ? profile.work_locations : [];
    const matchedLocation = workLocation?.id
      ? profileLocations.find((loc: any) => String(loc?.id) === String(workLocation.id))
      : null;
    const selectedWorkLocation = matchedLocation?.address ? {
      id: String(matchedLocation.id),
      name: String(matchedLocation.name || "Locatie"),
      address: String(matchedLocation.address),
      mapsUrl: \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(String(matchedLocation.address))}\`,
    } : null;
`,
    "stripe checkout selectedWorkLocation"
  );

  s = addAfter(
    s,
    '        clientDetalii: clientInfo.detalii || "",\n',
    '        workLocation: selectedWorkLocation ? JSON.stringify(selectedWorkLocation) : "",\n',
    "stripe checkout metadata location"
  );

  write(rel, s);
}

// 5) Stripe webhook: write selected location to appointments.
{
  const rel = "app\\api\\stripe\\webhook\\route.ts";
  let s = read(rel);

  s = addAfter(
    s,
    '        const paymentStatus = metadata.paymentStatus || "fully_paid";\n',
    '        let selectedWorkLocation: any = null;\n        try { selectedWorkLocation = metadata.workLocation ? JSON.parse(metadata.workLocation) : null; } catch {}\n',
    "webhook parse workLocation"
  );

  s = addAfter(
    s,
    '            payment_status: paymentStatus,\n',
    '            work_location_id: selectedWorkLocation?.id || null,\n            work_location_name: selectedWorkLocation?.name || null,\n            work_location_address: selectedWorkLocation?.address || null,\n            work_location_maps_url: selectedWorkLocation?.mapsUrl || null,\n',
    "webhook insert workLocation"
  );

  write(rel, s);
}

// 6) Emails: confirmation and reminders include saved appointment location.
{
  const rel = "app\\api\\send\\route.ts";
  let s = read(rel);

  s = replaceOnce(
    s,
    '.select("email, prenume, nume, date, time, user_id")',
    '.select("email, prenume, nume, date, time, user_id, work_location_name, work_location_address, work_location_maps_url")',
    "send select work location"
  );

  s = addAfter(
    s,
    '    const safeResponsiblePhone = escapeHtml(responsiblePhone);\n',
    '    const safeWorkLocationName = escapeHtml(appointment.work_location_name || "");\n    const safeWorkLocationAddress = escapeHtml(appointment.work_location_address || "");\n    const mapsUrl = appointment.work_location_maps_url || (appointment.work_location_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.work_location_address)}` : "");\n',
    "send safe work location"
  );

  s = addBefore(
    s,
    `            <div style="margin-top: 28px; text-align: center;">`,
    '            ${safeWorkLocationAddress ? `\n            <div style="margin-top: 22px; padding: 16px; background-color: #eff6ff; border-radius: 16px; border: 1px solid #bfdbfe;">\n              <p style="margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.08em;">Locatie</p>\n              ${safeWorkLocationName ? `<p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 900; color: #0f172a;">${safeWorkLocationName}</p>` : ""}\n              <p style="margin: 6px 0 12px 0; font-size: 13px; line-height: 1.5; color: #334155;"><strong style="color:#0f172a;">${safeWorkLocationAddress}</strong></p>\n              <a href="${mapsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; text-decoration: none;">Deschide in Google Maps</a>\n            </div>\n            ` : ""}\n',
    "send email location block"
  );

  write(rel, s);
}

{
  const rel = "app\\api\\reminders\\route.ts";
  let s = read(rel);

  s = replaceOnce(
    s,
    "function buildReminderHtml(nume: string, data: string, ora: string, appointmentId: string, serviciu?: string) {",
    "function buildReminderHtml(nume: string, data: string, ora: string, appointmentId: string, serviciu?: string, locationName?: string, locationAddress?: string, locationMapsUrl?: string) {",
    "reminders signature work location"
  );

  s = addAfter(
    s,
    '  const manageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/gestioneaza/${appointmentId}`;\n',
    '  const safeLocationName = locationName ? escapeHtml(locationName) : "";\n  const safeLocationAddress = locationAddress ? escapeHtml(locationAddress) : "";\n  const mapsUrl = locationMapsUrl || (locationAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}` : "");\n',
    "reminders safe work location"
  );

  s = addBefore(
    s,
    `        <div style="margin-top: 28px; text-align: center;">`,
    '        ${safeLocationAddress ? `\n        <div style="margin-top: 22px; padding: 16px; background-color: #eff6ff; border-radius: 16px; border: 1px solid #bfdbfe;">\n          <p style="margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.08em;">Locatie</p>\n          ${safeLocationName ? `<p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 900; color: #0f172a;">${safeLocationName}</p>` : ""}\n          <p style="margin: 6px 0 12px 0; font-size: 13px; line-height: 1.5; color: #334155;"><strong style="color:#0f172a;">${safeLocationAddress}</strong></p>\n          <a href="${mapsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; text-decoration: none;">Deschide in Google Maps</a>\n        </div>\n        ` : ""}\n',
    "reminders email location block"
  );

  s = replaceOnce(
    s,
    '.select("id, title, prenume, nume, email, phone, date, time, serviciu_id, reminder_sent, reminder_whatsapp_sent, user_id, total_price, amount_paid, payment_status")',
    '.select("id, title, prenume, nume, email, phone, date, time, serviciu_id, reminder_sent, reminder_whatsapp_sent, user_id, total_price, amount_paid, payment_status, work_location_name, work_location_address, work_location_maps_url")',
    "reminders select work location"
  );

  s = replaceOnce(
    s,
    'html: buildReminderHtml(clientName, appt.date, appt.time, appt.id),',
    'html: buildReminderHtml(clientName, appt.date, appt.time, appt.id, undefined, appt.work_location_name || "", appt.work_location_address || "", appt.work_location_maps_url || ""),',
    "reminders call work location"
  );

  write(rel, s);
}

{
  const rel = "app\\api\\reminders-2h\\route.ts";
  let s = read(rel);

  s = replaceOnce(
    s,
    '.select("id, title, prenume, nume, email, date, time, user_id, reminder_2h_sent, total_price, amount_paid, payment_status")',
    '.select("id, title, prenume, nume, email, date, time, user_id, reminder_2h_sent, total_price, amount_paid, payment_status, work_location_name, work_location_address, work_location_maps_url")',
    "2h select work location"
  );

  s = addAfter(
    s,
    '    const safeSalon = escapeHtml(profile.full_name || "Chronos");\n',
    '    const safeLocationName = appt.work_location_name ? escapeHtml(appt.work_location_name) : "";\n    const safeLocationAddress = appt.work_location_address ? escapeHtml(appt.work_location_address) : "";\n    const mapsUrl = appt.work_location_maps_url || (appt.work_location_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.work_location_address)}` : "");\n',
    "2h safe work location"
  );

  s = addBefore(
    s,
    `            </div>

            <p style="text-align: center; font-size: 10px;`,
    '              ${safeLocationAddress ? `\n              <div style="margin-top: 22px; padding: 16px; background-color: #eff6ff; border-radius: 16px; border: 1px solid #bfdbfe;">\n                <p style="margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.08em;">Locatie</p>\n                ${safeLocationName ? `<p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 900; color: #0f172a;">${safeLocationName}</p>` : ""}\n                <p style="margin: 6px 0 12px 0; font-size: 13px; line-height: 1.5; color: #334155;"><strong style="color:#0f172a;">${safeLocationAddress}</strong></p>\n                <a href="${mapsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; text-decoration: none;">Deschide in Google Maps</a>\n              </div>\n              ` : ""}\n',
    "2h email location block"
  );

  write(rel, s);
}

// 7) Calendar manual WhatsApp message: use appointment saved location.
{
  const rel = "app\\[locale]\\programari\\calendar\\page.tsx";
  let s = read(rel);

  s = replaceOnce(
    s,
    '  totalPrice?: number; amountPaid?: number; paymentStatus?: string;\n};',
    '  totalPrice?: number; amountPaid?: number; paymentStatus?: string;\n  workLocationName?: string; workLocationAddress?: string; workLocationMapsUrl?: string;\n};',
    "calendar Prog work location fields"
  );

  s = replaceOnce(
    s,
    '    totalPrice: it.total_price??0, amountPaid: it.amount_paid??0, paymentStatus: it.payment_status??"unpaid",\n',
    '    totalPrice: it.total_price??0, amountPaid: it.amount_paid??0, paymentStatus: it.payment_status??"unpaid",\n    workLocationName: it.work_location_name??"", workLocationAddress: it.work_location_address??"", workLocationMapsUrl: it.work_location_maps_url??"",\n',
    "calendar mapRow work location"
  );

  s = replaceOnce(
    s,
    'select("id,title,prenume,nume,email,date,time,details,phone,poza,file_url,documente,angajat_id,serviciu_id,duration,is_client_booking,total_price,amount_paid,payment_status")',
    'select("id,title,prenume,nume,email,date,time,details,phone,poza,file_url,documente,angajat_id,serviciu_id,duration,is_client_booking,total_price,amount_paid,payment_status,work_location_name,work_location_address,work_location_maps_url")',
    "calendar appointment select work location"
  );

  s = replaceOnce(
    s,
    'useEffect(()=>{if(!editForm)return;const sn=rawServices.find(s=>s.id===editForm.serviciuId)?.nume_serviciu;const base=t("editModal.whatsappMessageBase",{nume:editForm.nume,data:editForm.data,ora:editForm.ora});const suffix=sn?t("editModal.whatsappMessageServiceSuffix",{serviciu:sn}):"";setCustomMsg(`${base}${suffix}.`);},[editForm?.id]);',
    'useEffect(()=>{if(!editForm)return;const sn=rawServices.find(s=>s.id===editForm.serviciuId)?.nume_serviciu;const base=t("editModal.whatsappMessageBase",{nume:editForm.nume,data:editForm.data,ora:editForm.ora});const suffix=sn?t("editModal.whatsappMessageServiceSuffix",{serviciu:sn}):"";const locationBlock=editForm.workLocationAddress?`\\n${t("editModal.whatsappLocationLine",{location:editForm.workLocationName||editForm.workLocationAddress})}\\n${t("editModal.whatsappMapsLine",{maps:editForm.workLocationMapsUrl||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editForm.workLocationAddress)}`})}`:"";setCustomMsg(`${base}${suffix}.${locationBlock}`);},[editForm?.id,rawServices,t]);',
    "calendar whatsapp message work location"
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

// 8) API WhatsApp template route: read saved location for future template expansion.
{
  const rel = "app\\api\\send-whatsapp-confirmation\\route.ts";
  let s = read(rel);

  s = replaceOnce(
    s,
    '.select("phone, prenume, nume, date, time, user_id")',
    '.select("phone, prenume, nume, date, time, user_id, work_location_name, work_location_address, work_location_maps_url")',
    "whatsapp api select work location"
  );

  write(rel, s);
}

// 9) Translations.
const translations = {
  ro: {
    profil: {
      workLocationsTitle: "Adrese de lucru",
      workLocationsHint: "Adauga punctele de lucru unde clientii pot veni la programari. Acestea apar pe pagina publica si in confirmarile trimise clientilor.",
      addWorkLocationBtn: "Adauga adresa",
      removeWorkLocationBtn: "Sterge",
      noWorkLocations: "Nu ai adaugat inca nicio adresa de lucru.",
      workLocationNamePlaceholder: "Locatia {n}",
      workLocationAddressPlaceholder: "Strada, numar, oras",
    },
    rezervare: {
      workLocationTitle: "Alege punctul de lucru",
      workLocationHint: "Alege locatia unde vrei sa ajungi la programare.",
      defaultWorkLocationName: "Locatie de lucru",
      openMapsBtn: "Deschide in Google Maps",
      chooseWorkLocationMsg: "Te rugam sa alegi punctul de lucru pentru programare.",
    },
    calendar: {
      whatsappLocationLine: "Locatie: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
  en: {
    profil: {
      workLocationsTitle: "Work locations",
      workLocationsHint: "Add the locations where clients can come for appointments. They appear on the public booking page and in client confirmations.",
      addWorkLocationBtn: "Add address",
      removeWorkLocationBtn: "Remove",
      noWorkLocations: "You have not added any work location yet.",
      workLocationNamePlaceholder: "Location {n}",
      workLocationAddressPlaceholder: "Street, number, city",
    },
    rezervare: {
      workLocationTitle: "Choose work location",
      workLocationHint: "Choose where you want to go for this appointment.",
      defaultWorkLocationName: "Work location",
      openMapsBtn: "Open in Google Maps",
      chooseWorkLocationMsg: "Please choose the work location for your appointment.",
    },
    calendar: {
      whatsappLocationLine: "Location: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
};

const fallbackLocales = ["de", "es", "fr", "hu", "it", "pl", "pt"];
for (const loc of fallbackLocales) translations[loc] = translations.en;

for (const [locale, values] of Object.entries(translations)) {
  const rel = `messages\\${locale}.json`;
  const data = JSON.parse(read(rel));
  data.profil = { ...data.profil, ...values.profil };
  data.rezervare = { ...data.rezervare, ...values.rezervare };
  data.calendarPage = data.calendarPage || {};
  data.calendarPage.editModal = {
    ...(data.calendarPage.editModal || {}),
    whatsappLocationLine: values.calendar.whatsappLocationLine,
    whatsappMapsLine: values.calendar.whatsappMapsLine,
  };
  write(rel, JSON.stringify(data, null, 2) + "\n");
}

// 10) SQL helper.
const sql = `alter table public.profiles
add column if not exists work_locations jsonb not null default '[]'::jsonb;

comment on column public.profiles.work_locations is 'Business work locations shown on public booking pages and saved on appointments.';

alter table public.appointments
add column if not exists work_location_id text,
add column if not exists work_location_name text,
add column if not exists work_location_address text,
add column if not exists work_location_maps_url text;

comment on column public.appointments.work_location_id is 'Selected work location id from profiles.work_locations at booking time.';
comment on column public.appointments.work_location_name is 'Selected work location name saved at booking time.';
comment on column public.appointments.work_location_address is 'Selected work location address saved at booking time.';
comment on column public.appointments.work_location_maps_url is 'Google Maps URL for the selected work location.';

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
  (stripe_account_id is not null) as has_stripe_account,
  stripe_onboarded,
  currency,
  require_payment_at_booking,
  work_locations
from public.profiles
where slug is not null;
`;

write("supabase-add-work-locations.sql", sql);

console.log("Chronos work locations changes applied.");
console.log("SQL created: D:\\\\programari\\\\supabase-add-work-locations.sql");
