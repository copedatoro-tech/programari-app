const fs = require("fs");
const path = require("path");

const root = "D:\\programari";
const files = {
  resurse: path.join(root, "app", "[locale]", "resurse", "page.tsx"),
  rezervare: path.join(root, "app", "[locale]", "rezervare", "[slug]", "page.tsx"),
  sql: path.join(root, "supabase-add-staff-photo-url.sql"),
};

const utf8 = "utf8";

function read(file) {
  return fs.readFileSync(file, utf8);
}

function write(file, text) {
  fs.writeFileSync(file, text, utf8);
}

function replaceOnce(text, oldText, newText, label) {
  if (text.includes(oldText)) {
    return text.replace(oldText, newText);
  }
  const oldLf = oldText.replace(/\r\n/g, "\n");
  const newLf = newText.replace(/\r\n/g, "\n");
  if (text.includes(oldLf)) {
    return text.replace(oldLf, newLf);
  }
  const oldCrLf = oldText.replace(/\r?\n/g, "\r\n");
  const newCrLf = newText.replace(/\r?\n/g, "\r\n");
  if (text.includes(oldCrLf)) {
    return text.replace(oldCrLf, newCrLf);
  }
  {
    throw new Error(`Could not find expected block: ${label}`);
  }
}

function patchResurse() {
  let text = read(files.resurse);

  if (!text.includes("import Image from 'next/image';")) {
    text = replaceOnce(
      text,
      "import { useTranslations } from 'next-intl';\r\n",
      "import { useTranslations } from 'next-intl';\r\nimport Image from 'next/image';\r\n",
      "resurse import Image"
    );
  }

  if (!text.includes("async function handleUploadStaffPhoto")) {
    text = replaceOnce(
      text,
      "  const toggleServiciuStaff = (serviceId: string) => {\r\n",
      `  async function handleUploadStaffPhoto(staffId: string, file?: File | null) {\r\n    if (!file || !userId || isDemo) return;\r\n    if (!file.type.startsWith("image/")) {\r\n      alert(t("staffPhotoImageOnly"));\r\n      return;\r\n    }\r\n    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";\r\n    const filePath = \`staff/\${userId}/\${staffId}-\${Date.now()}.\${ext}\`;\r\n    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });\r\n    if (uploadError) { alert(\`\${t("staffPhotoUploadError")} \${uploadError.message}\`); return; }\r\n    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);\r\n    const photoUrl = data.publicUrl;\r\n    const { error } = await supabase.from("staff").update({ photo_url: photoUrl }).eq("id", staffId).eq("user_id", userId);\r\n    if (error) { alert(error.message); return; }\r\n    await fetchResurse(userId);\r\n    if (editingId === staffId) setEditForm((prev: any) => prev ? { ...prev, photo_url: photoUrl } : prev);\r\n  }\r\n\r\n  async function handleRemoveStaffPhoto(staffId: string) {\r\n    if (!userId || isDemo) return;\r\n    const { error } = await supabase.from("staff").update({ photo_url: null }).eq("id", staffId).eq("user_id", userId);\r\n    if (error) { alert(error.message); return; }\r\n    await fetchResurse(userId);\r\n    if (editingId === staffId) setEditForm((prev: any) => prev ? { ...prev, photo_url: null } : prev);\r\n  }\r\n\r\n  const toggleServiciuStaff = (serviceId: string) => {\r\n`,
      "resurse staff photo handlers"
    );
  }

  const oldEditStart = `                    <div ref={editStaffRef} className="p-8 space-y-6 bg-slate-800 animate-in slide-in-from-bottom-2 duration-200">\r\n                      <input className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-black uppercase italic text-[11px]"\r\n                        value={editForm?.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />`;
  const newEditStart = `                    <div ref={editStaffRef} className="p-8 space-y-6 bg-slate-800 animate-in slide-in-from-bottom-2 duration-200">\r\n                      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">\r\n                        <div className="relative w-24 h-24 rounded-[28px] overflow-hidden bg-slate-900 border-2 border-slate-700 flex items-center justify-center shrink-0">\r\n                          {editForm?.photo_url ? (\r\n                            <Image src={editForm.photo_url} alt={editForm?.name || t("staffPhotoAlt")} fill className="object-cover" />\r\n                          ) : (\r\n                            <span className="text-3xl font-black text-amber-500 uppercase italic">{(editForm?.name || "?").slice(0, 1)}</span>\r\n                          )}\r\n                        </div>\r\n                        <div className="flex-1 w-full space-y-3">\r\n                          <input className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-black uppercase italic text-[11px]"\r\n                            value={editForm?.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />\r\n                          <div className="flex flex-wrap gap-2">\r\n                            <label className="cursor-pointer px-4 py-3 bg-slate-900 border-2 border-slate-700 text-amber-500 rounded-xl text-[9px] font-black uppercase italic hover:bg-amber-500 hover:text-slate-900 transition-all">\r\n                              {t("staffPhotoUploadBtn")}\r\n                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadStaffPhoto(editingId!, e.target.files?.[0])} />\r\n                            </label>\r\n                            {editForm?.photo_url && (\r\n                              <button onClick={() => handleRemoveStaffPhoto(editingId!)} className="px-4 py-3 bg-slate-900 border-2 border-slate-700 text-red-400 rounded-xl text-[9px] font-black uppercase italic hover:bg-red-500 hover:text-white transition-all">\r\n                                {t("staffPhotoRemoveBtn")}\r\n                              </button>\r\n                            )}\r\n                          </div>\r\n                        </div>\r\n                      </div>`;

  if (!text.includes("staffPhotoUploadBtn")) {
    text = replaceOnce(text, oldEditStart, newEditStart, "resurse edit staff photo UI");
  }

  const oldStaffCard = `                    <div className="p-6 flex justify-between items-center cursor-pointer" onClick={() => activeazaEditare(p, 'staff')}>\r\n                      <div className="flex-1">\r\n                        <p className="font-black uppercase italic text-[13px] text-white group-hover:text-amber-500 transition-colors">{p.name}</p>`;
  const newStaffCard = `                    <div className="p-6 flex justify-between items-center gap-4 cursor-pointer" onClick={() => activeazaEditare(p, 'staff')}>\r\n                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">\r\n                        {p.photo_url ? (\r\n                          <Image src={p.photo_url} alt={p.name || t("staffPhotoAlt")} fill className="object-cover" />\r\n                        ) : (\r\n                          <span className="text-2xl font-black text-amber-500 uppercase italic">{(p.name || "?").slice(0, 1)}</span>\r\n                        )}\r\n                      </div>\r\n                      <div className="flex-1 min-w-0">\r\n                        <p className="font-black uppercase italic text-[13px] text-white group-hover:text-amber-500 transition-colors truncate">{p.name}</p>`;
  if (!text.includes("p.photo_url ?")) {
    text = replaceOnce(text, oldStaffCard, newStaffCard, "resurse staff list photo");
  }

  write(files.resurse, text);
}

function patchRezervare() {
  let text = read(files.rezervare);

  text = text.replace(
    "interface StaffRow { id: string; name: string; services: string[]; working_hours?: any }",
    "interface StaffRow { id: string; name: string; services: string[]; working_hours?: any; photo_url?: string | null }"
  );

  const oldSelect = `                        <div className="space-y-2">\r\n                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("expertLabel")}</label>\r\n                          <select\r\n                            className="w-full bg-white border-2 border-amber-500 rounded-[25px] py-4 px-6 text-[14px] font-black uppercase italic outline-none cursor-pointer"\r\n                            value={b.specialist_id}\r\n                            onChange={(e) => updateBooking(b.id, { specialist_id: e.target.value })}>\r\n                            <option value="">{t("firstAvailOpt")}</option>\r\n                            {specialisti\r\n                              .filter(s => !b.serviciu_id || s.services.includes(b.serviciu_id))\r\n                              .map((sp) => (\r\n                                <option key={sp.id} value={sp.id}>{sp.name.toUpperCase()}</option>\r\n                              ))}\r\n                          </select>\r\n                        </div>`;

  const newCards = `                        <div className="space-y-2">\r\n                          <label className="text-[10px] font-black uppercase italic text-slate-400 ml-4">{t("expertLabel")}</label>\r\n                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">\r\n                            <button\r\n                              type="button"\r\n                              onClick={() => updateBooking(b.id, { specialist_id: \"\" })}\r\n                              className={\`min-h-[132px] rounded-[24px] border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all \${!b.specialist_id ? \"border-amber-500 bg-amber-50 shadow-lg\" : \"border-slate-200 bg-white hover:border-amber-300\"}\`}\r\n                            >\r\n                              <div className={\`w-16 h-16 rounded-full flex items-center justify-center font-black text-xl \${!b.specialist_id ? \"bg-amber-500 text-white\" : \"bg-slate-100 text-slate-400\"}\`}>*</div>\r\n                              <span className=\"text-[9px] font-black uppercase italic text-slate-700 text-center leading-tight\">{t(\"firstAvailOpt\")}</span>\r\n                            </button>\r\n                            {specialisti\r\n                              .filter(s => !b.serviciu_id || s.services.includes(b.serviciu_id))\r\n                              .map((sp) => {\r\n                                const selected = b.specialist_id === sp.id;\r\n                                return (\r\n                                  <button\r\n                                    type=\"button\"\r\n                                    key={sp.id}\r\n                                    onClick={() => updateBooking(b.id, { specialist_id: sp.id })}\r\n                                    className={\`min-h-[132px] rounded-[24px] border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all \${selected ? \"border-amber-500 bg-amber-50 shadow-lg\" : \"border-slate-200 bg-white hover:border-amber-300\"}\`}\r\n                                  >\r\n                                    <div className=\"relative w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center\">\r\n                                      {sp.photo_url ? (\r\n                                        <Image src={sp.photo_url} alt={sp.name} fill className=\"object-cover\" />\r\n                                      ) : (\r\n                                        <span className=\"text-xl font-black text-amber-500 uppercase italic\">{(sp.name || \"?\").slice(0, 1)}</span>\r\n                                      )}\r\n                                    </div>\r\n                                    <span className=\"text-[9px] font-black uppercase italic text-slate-700 text-center leading-tight line-clamp-2\">{sp.name}</span>\r\n                                  </button>\r\n                                );\r\n                              })}\r\n                          </div>\r\n                        </div>`;

  if (!text.includes("sp.photo_url ?")) {
    text = replaceOnce(text, oldSelect, newCards, "rezervare specialist cards");
  }

  write(files.rezervare, text);
}

function writeSql() {
  const sql = `-- Run this in Supabase SQL Editor before using specialist photos.
alter table public.staff
add column if not exists photo_url text;

comment on column public.staff.photo_url is 'Optional public image URL used on the booking page for this specialist.';
`;
  write(files.sql, sql);
}

patchResurse();
patchRezervare();
writeSql();

console.log("Staff photo feature files updated.");
console.log("Next: run supabase-add-staff-photo-url.sql in Supabase SQL Editor.");
