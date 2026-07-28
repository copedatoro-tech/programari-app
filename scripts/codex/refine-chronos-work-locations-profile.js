const fs = require("fs");

const file = "D:\\programari\\app\\[locale]\\profil\\page.tsx";
let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

function replaceOnce(search, replacement, label) {
  if (!s.includes(search)) throw new Error(`Could not find block: ${label}`);
  s = s.replace(search, replacement);
}

replaceOnce(
  `          const rawLocations = Array.isArray(profile?.work_locations) ? profile.work_locations : [];
          setWorkLocations(rawLocations.map((loc: any, index: number) => ({
            id: String(loc?.id || \`loc-\${index + 1}\`),
            name: String(loc?.name || ""),
            address: String(loc?.address || ""),
          })));`,
  `          const rawLocations = Array.isArray(profile?.work_locations) ? profile.work_locations : [];
          const normalizedLocations = rawLocations.map((loc: any, index: number) => ({
            id: String(loc?.id || \`loc-\${index + 1}\`),
            name: String(loc?.name || ""),
            address: String(loc?.address || ""),
          }));
          setWorkLocations(normalizedLocations.length > 0
            ? normalizedLocations
            : [{ id: "loc-primary", name: "", address: "" }]
          );`,
  "load default work location"
);

replaceOnce(
  `  const removeWorkLocation = (id: string) => {
    if (isDemo) return;
    setWorkLocations((prev) => prev.filter((loc) => loc.id !== id));
  };`,
  `  const removeWorkLocation = (id: string) => {
    if (isDemo) return;
    setWorkLocations((prev) => {
      if (prev.length <= 1) return [{ id: prev[0]?.id || "loc-primary", name: "", address: "" }];
      return prev.filter((loc) => loc.id !== id);
    });
  };`,
  "keep one work location"
);

replaceOnce(
  `            {workLocations.length === 0 && (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[30px] p-6 text-center">
                <p className="text-xs font-bold text-slate-400 italic">{t("noWorkLocations")}</p>
              </div>
            )}

            <div className="space-y-4">`,
  `            <div className="space-y-4">`,
  "remove empty work locations message"
);

replaceOnce(
  `                  <button
                    type="button"
                    onClick={() => removeWorkLocation(loc.id)}
                    disabled={isDemo}
                    className="px-5 py-4 bg-red-50 text-red-500 rounded-2xl text-[9px] font-black uppercase italic hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    {t("removeWorkLocationBtn")}
                  </button>`,
  `                  {workLocations.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeWorkLocation(loc.id)}
                      disabled={isDemo}
                      className="px-5 py-4 bg-red-50 text-red-500 rounded-2xl text-[9px] font-black uppercase italic hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                    >
                      {t("removeWorkLocationBtn")}
                    </button>
                  ) : (
                    <div className="hidden md:block" />
                  )}`,
  "hide remove button for first single location"
);

fs.writeFileSync(file, s, "utf8");
console.log("Profile work locations refined.");
