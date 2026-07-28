const fs = require("fs");
const path = require("path");

const file = path.join("D:\\programari", "app", "[locale]", "rezervare", "[slug]", "page.tsx");

function replaceOnce(text, oldText, newText, label) {
  if (text.includes(oldText)) return text.replace(oldText, newText);
  const oldLf = oldText.replace(/\r\n/g, "\n");
  const newLf = newText.replace(/\r\n/g, "\n");
  if (text.includes(oldLf)) return text.replace(oldLf, newLf);
  throw new Error(`Could not find expected block: ${label}`);
}

let text = fs.readFileSync(file, "utf8");

if (!text.includes("specialistPickerBookingId")) {
  const statePattern = /(const \[waitlistModal, setWaitlistModal\] = useState<\{ bookingId: string \} \| null>\(null\);\r?\n)(\s*const \[waitlistSaving, setWaitlistSaving\] = useState\(false\);)/;
  if (!statePattern.test(text)) {
    throw new Error("Could not find expected block: add specialist picker state");
  }
  text = text.replace(
    statePattern,
    `$1  const [specialistPickerBookingId, setSpecialistPickerBookingId] = useState<string | null>(null);\n$2`
  );
}

const oldInlinePicker = `                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("expertLabel")}</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => updateBooking(b.id, { specialist_id: "" })}
                              className={\`min-h-[132px] rounded-[24px] border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all \${!b.specialist_id ? "border-amber-500 bg-amber-50 shadow-lg" : "border-slate-200 bg-white hover:border-amber-300"}\`}
                            >
                              <div className={\`w-16 h-16 rounded-full flex items-center justify-center font-black text-xl \${!b.specialist_id ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"}\`}>*</div>
                              <span className="text-[9px] font-black uppercase italic text-slate-700 text-center leading-tight">{t("firstAvailOpt")}</span>
                            </button>
                            {specialisti
                              .filter(s => !b.serviciu_id || s.services.includes(b.serviciu_id))
                              .map((sp) => {
                                const selected = b.specialist_id === sp.id;
                                return (
                                  <button
                                    type="button"
                                    key={sp.id}
                                    onClick={() => updateBooking(b.id, { specialist_id: sp.id })}
                                    className={\`min-h-[132px] rounded-[24px] border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all \${selected ? "border-amber-500 bg-amber-50 shadow-lg" : "border-slate-200 bg-white hover:border-amber-300"}\`}
                                  >
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center">
                                      {sp.photo_url ? (
                                        <Image src={sp.photo_url} alt={sp.name} fill className="object-cover" />
                                      ) : (
                                        <span className="text-xl font-black text-amber-500 uppercase italic">{(sp.name || "?").slice(0, 1)}</span>
                                      )}
                                    </div>
                                    <span className="text-[9px] font-black uppercase italic text-slate-700 text-center leading-tight line-clamp-2">{sp.name}</span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>`;

const newCompactPicker = `                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("expertLabel")}</label>
                          {(() => {
                            const selectedSpecialist = specialisti.find(sp => sp.id === b.specialist_id);
                            return (
                              <button
                                type="button"
                                onClick={() => setSpecialistPickerBookingId(b.id)}
                                className="w-full min-h-[74px] bg-white border-2 border-amber-500 rounded-[25px] py-3 px-4 text-left outline-none cursor-pointer hover:shadow-lg transition-all flex items-center gap-4"
                              >
                                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center shrink-0">
                                  {selectedSpecialist?.photo_url ? (
                                    <Image src={selectedSpecialist.photo_url} alt={selectedSpecialist.name} fill className="object-cover" />
                                  ) : (
                                    <span className="text-lg font-black text-amber-500 uppercase italic">{selectedSpecialist ? (selectedSpecialist.name || "?").slice(0, 1) : "*"}</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="block text-[9px] font-black uppercase italic text-slate-400 tracking-widest">{t("chooseSpecialistBtn")}</span>
                                  <span className="block text-[13px] font-black uppercase italic text-slate-900 truncate">
                                    {selectedSpecialist?.name || t("firstAvailOpt")}
                                  </span>
                                </div>
                              </button>
                            );
                          })()}
                        </div>`;

if (text.includes(oldInlinePicker)) {
  text = text.replace(oldInlinePicker, newCompactPicker);
} else if (!text.includes("selectedSpecialist = specialisti.find")) {
  const startNeedle = `                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("expertLabel")}</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">`;
  const start = text.indexOf(startNeedle);
  if (start === -1) {
    throw new Error("Could not find expected block: inline specialist picker start");
  }
  const endNeedle = `                          </div>
                        </div>`;
  const end = text.indexOf(endNeedle, start);
  if (end === -1) {
    throw new Error("Could not find expected block: inline specialist picker end");
  }
  text = text.slice(0, start) + newCompactPicker + text.slice(end + endNeedle.length);
}

const marker = `      {waitlistModal && (`;
const modalBlock = `      {specialistPickerBookingId && (() => {
        const bookingForPicker = bookings.find((b) => b.id === specialistPickerBookingId);
        if (!bookingForPicker) return null;
        const availableSpecialists = specialisti.filter(s => !bookingForPicker.serviciu_id || s.services.includes(bookingForPicker.serviciu_id));
        return (
          <div className="fixed inset-0 z-[840] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSpecialistPickerBookingId(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-2xl rounded-[36px] p-6 md:p-8 shadow-2xl border-t-[8px] border-amber-500 max-h-[82vh] flex flex-col">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className="text-[9px] font-black uppercase italic text-amber-500 tracking-widest">{t("expertLabel")}</span>
                  <h3 className="text-xl md:text-2xl font-black uppercase italic text-slate-900 tracking-tighter">{t("chooseSpecialistBtn")}</h3>
                </div>
                <button type="button" onClick={() => setSpecialistPickerBookingId(null)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 font-black hover:bg-red-500 hover:text-white transition-all">x</button>
              </div>
              <div className="overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-1">
                  <button
                    type="button"
                    onClick={() => { updateBooking(specialistPickerBookingId, { specialist_id: "" }); setSpecialistPickerBookingId(null); }}
                    className={\`min-h-[132px] rounded-[26px] border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all \${!bookingForPicker.specialist_id ? "border-amber-500 bg-amber-50 shadow-lg" : "border-slate-200 bg-white hover:border-amber-300"}\`}
                  >
                    <div className={\`w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl shadow-sm \${!bookingForPicker.specialist_id ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"}\`}>*</div>
                    <span className="text-[9px] font-black uppercase italic text-slate-700 text-center leading-tight">{t("firstAvailOpt")}</span>
                  </button>
                  {availableSpecialists.map((sp) => {
                    const selected = bookingForPicker.specialist_id === sp.id;
                    return (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => { updateBooking(specialistPickerBookingId, { specialist_id: sp.id }); setSpecialistPickerBookingId(null); }}
                        className={\`min-h-[132px] rounded-[26px] border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all \${selected ? "border-amber-500 bg-amber-50 shadow-lg" : "border-slate-200 bg-white hover:border-amber-300"}\`}
                      >
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-[3px] border-white shadow-md flex items-center justify-center">
                          {sp.photo_url ? (
                            <Image src={sp.photo_url} alt={sp.name} fill className="object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-amber-500 uppercase italic">{(sp.name || "?").slice(0, 1)}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-black uppercase italic text-slate-700 text-center leading-tight line-clamp-2">{sp.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

`;

if (!text.includes("availableSpecialists = specialisti.filter")) {
  text = replaceOnce(text, marker, modalBlock + marker, "insert specialist picker modal");
}

const translationScript = path.join("D:\\programari", "messages");
for (const fileName of fs.readdirSync(translationScript).filter((name) => name.endsWith(".json"))) {
  const filePath = path.join(translationScript, fileName);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!data.rezervare || typeof data.rezervare !== "object") {
    throw new Error(`Missing rezervare object in ${fileName}`);
  }
  if (!data.rezervare.chooseSpecialistBtn) {
    const locale = path.basename(fileName, ".json");
    const values = {
      ro: "Alege specialistul",
      en: "Choose specialist",
      de: "Spezialist auswahlen",
      es: "Elegir especialista",
      fr: "Choisir le specialiste",
      hu: "Szakember valasztasa",
      it: "Scegli specialista",
      pl: "Wybierz specjaliste",
      pt: "Escolher especialista",
    };
    data.rezervare.chooseSpecialistBtn = values[locale] || values.en;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }
}

fs.writeFileSync(file, text, "utf8");
console.log("Specialist picker modal added.");
