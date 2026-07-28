const fs = require("fs");
const path = require("path");

const file = path.join("D:\\programari", "app", "[locale]", "rezervare", "[slug]", "page.tsx");
let text = fs.readFileSync(file, "utf8");

const oldButton = `                              <button
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

const newButton = `                              <button
                                type="button"
                                onClick={() => setSpecialistPickerBookingId(b.id)}
                                className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-4 px-6 text-[14px] font-black uppercase italic text-slate-900 text-left outline-none cursor-pointer hover:shadow-lg transition-all flex items-center justify-between gap-4"
                              >
                                <span className="truncate">{selectedSpecialist?.name || t("chooseSpecialistBtn")}</span>
                                <span className="text-amber-500 text-xl font-black leading-none shrink-0">›</span>
                              </button>`;

if (!text.includes(oldButton)) {
  if (!text.includes('className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-4 px-6 text-[14px] font-black uppercase italic')) {
    throw new Error("Could not find compact specialist button.");
  }
} else {
  text = text.replace(oldButton, newButton);
}

const oldFirstAvail = `                    <div className={\`w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl shadow-sm \${!bookingForPicker.specialist_id ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"}\`}>*</div>`;

const newFirstAvail = `                    <div className={\`w-20 h-20 rounded-full flex items-center justify-center shadow-md border-2 \${!bookingForPicker.specialist_id ? "bg-amber-500 border-amber-500 text-slate-950" : "bg-slate-100 border-white text-slate-500"}\`}>
                      <span className="relative w-9 h-9 block">
                        <span className="absolute left-1/2 top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-[3px] border-current"></span>
                        <span className="absolute left-1/2 bottom-1 -translate-x-1/2 w-7 h-4 rounded-t-full border-[3px] border-current border-b-0"></span>
                        <span className="absolute -right-1 bottom-0 w-4 h-4 rounded-full bg-white text-amber-500 text-[11px] font-black flex items-center justify-center shadow-sm">✓</span>
                      </span>
                    </div>`;

if (!text.includes(oldFirstAvail)) {
  if (!text.includes("rounded-t-full border-[3px] border-current")) {
    throw new Error("Could not find first availability icon.");
  }
} else {
  text = text.replace(oldFirstAvail, newFirstAvail);
}

fs.writeFileSync(file, text, "utf8");
console.log("Specialist picker UI refined.");
