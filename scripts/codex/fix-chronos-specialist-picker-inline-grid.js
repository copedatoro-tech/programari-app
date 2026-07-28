const fs = require("fs");
const path = require("path");

const file = path.join("D:\\programari", "app", "[locale]", "rezervare", "[slug]", "page.tsx");
let text = fs.readFileSync(file, "utf8");

const replacement = `                        <div className="space-y-2">
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
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`;

if (text.includes("selectedSpecialist = specialisti.find")) {
  console.log("Inline grid already replaced.");
  process.exit(0);
}

const inlineGridPattern =
  / {24}<div className="space-y-2">\r?\n {26}<label className="text-\[10px\] font-black uppercase italic text-slate-400 ml-4">\{t\("expertLabel"\)\}<\/label>\r?\n {26}<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">[\s\S]*?\r?\n {22}<\/div>\r?\n\r?\n {22}<div className="grid grid-cols-1 md:grid-cols-2 gap-4">/;

if (!inlineGridPattern.test(text)) {
  throw new Error("Could not find inline specialist grid.");
}

text = text.replace(inlineGridPattern, replacement);
fs.writeFileSync(file, text, "utf8");

console.log("Inline specialist grid replaced with compact modal button.");
