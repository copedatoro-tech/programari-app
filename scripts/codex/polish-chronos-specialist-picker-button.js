const fs = require("fs");
const path = require("path");

const file = path.join("D:\\programari", "app", "[locale]", "rezervare", "[slug]", "page.tsx");
let text = fs.readFileSync(file, "utf8");

const oldBlock = `                              <button
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
                              </button>`;

const newBlock = `                              <button
                                type="button"
                                onClick={() => setSpecialistPickerBookingId(b.id)}
                                className="w-full h-[68px] bg-white border-2 border-amber-500 rounded-[25px] py-4 px-6 text-left outline-none cursor-pointer hover:shadow-lg transition-all flex items-center gap-4"
                              >
                                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center shrink-0">
                                  {selectedSpecialist?.photo_url ? (
                                    <Image src={selectedSpecialist.photo_url} alt={selectedSpecialist.name} fill className="object-cover" />
                                  ) : (
                                    <span className="text-base font-black text-amber-500 uppercase italic">{selectedSpecialist ? (selectedSpecialist.name || "?").slice(0, 1) : "+"}</span>
                                  )}
                                </div>
                                <span className="min-w-0 flex-1 text-[14px] font-black uppercase italic text-slate-900 truncate">
                                  {selectedSpecialist?.name || t("chooseSpecialistBtn")}
                                </span>
                                <span className="text-amber-500 text-xl font-black leading-none shrink-0">›</span>
                              </button>`;

if (!text.includes(oldBlock)) {
  if (text.includes('className="w-full h-[68px] bg-white border-2 border-amber-500')) {
    console.log("Specialist picker button already polished.");
    process.exit(0);
  }
  throw new Error("Could not find specialist picker button block.");
}

text = text.replace(oldBlock, newBlock);
fs.writeFileSync(file, text, "utf8");
console.log("Specialist picker button polished.");
