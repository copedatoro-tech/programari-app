"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type DocumentAttachment = {
  id: number;
  name: string;
  url: string;
};

type Programare = {
  id: number;
  nume: string;
  data: string;
  ora: string;
  motiv: string;
  telefon: string;
  poza: string | null;

  // Reminder nou
  reminderMinutes: number;
  reminderSound: boolean;
  reminderVibration: boolean;
  reminderVolume: number; // 0–100
  reminderForOther: boolean;

  documente: DocumentAttachment[];
};

function ProgramariContent() {
  const [programari, setProgramari] = useState<Programare[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [popupProgramare, setPopupProgramare] = useState<Programare | null>(null);

  const [formular, setFormular] = useState<Programare>({
    id: 0,
    nume: "",
    data: "",
    ora: "",
    motiv: "",
    telefon: "",
    poza: null,

    reminderMinutes: 10,
    reminderSound: true,
    reminderVibration: true,
    reminderVolume: 70,
    reminderForOther: true,

    documente: [],
  });

  const searchParams = useSearchParams();
  const idFromCalendar = searchParams.get("id");

  useEffect(() => {
    const saved = localStorage.getItem("programari");
    if (saved) {
      try {
        setProgramari(JSON.parse(saved));
      } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("programari", JSON.stringify(programari));
    }
  }, [programari, loaded]);

  useEffect(() => {
    document.body.style.overflow = popupProgramare ? "hidden" : "auto";
  }, [popupProgramare]);

  useEffect(() => {
    if (idFromCalendar && programari.length > 0) {
      const found = programari.find((p) => p.id === Number(idFromCalendar));
      if (found) setPopupProgramare(found);
    }
  }, [idFromCalendar, programari]);

  const incarcaPozaFormular = (file: File) => {
    const reader = new FileReader();
    reader.onload = () =>
      setFormular((prev) => ({ ...prev, poza: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const incarcaPozaPopup = (file: File) => {
    if (!popupProgramare) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setPopupProgramare({ ...popupProgramare, poza: url });
      setProgramari((prev) =>
        prev.map((p) => (p.id === popupProgramare.id ? { ...p, poza: url } : p))
      );
    };
    reader.readAsDataURL(file);
  };

  const adaugaDocumentFormular = (file: File) => {
    const reader = new FileReader();
    reader.onload = () =>
      setFormular((prev) => ({
        ...prev,
        documente: [
          ...prev.documente,
          { id: Date.now(), name: file.name, url: reader.result as string },
        ],
      }));
    reader.readAsDataURL(file);
  };

  const adaugaDocumentPopup = (file: File) => {
    if (!popupProgramare) return;
    const reader = new FileReader();
    reader.onload = () => {
      const doc = {
        id: Date.now(),
        name: file.name,
        url: reader.result as string,
      };
      setPopupProgramare({
        ...popupProgramare,
        documente: [...popupProgramare.documente, doc],
      });
      setProgramari((prev) =>
        prev.map((p) =>
          p.id === popupProgramare.id
            ? { ...p, documente: [...p.documente, doc] }
            : p
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const stergeDocumentPopup = (docId: number) => {
    if (!popupProgramare) return;
    const actualizate = popupProgramare.documente.filter((d) => d.id !== docId);
    setPopupProgramare({ ...popupProgramare, documente: actualizate });
    setProgramari((prev) =>
      prev.map((p) =>
        p.id === popupProgramare.id ? { ...p, documente: actualizate } : p
      )
    );
  };

  const salveazaProgramareNoua = () => {
    if (!formular.nume || !formular.data || !formular.ora) return;

    const noua: Programare = { ...formular, id: Date.now() };
    setProgramari((prev) => [...prev, noua]);

    setFormular({
      id: 0,
      nume: "",
      data: "",
      ora: "",
      motiv: "",
      telefon: "",
      poza: null,

      reminderMinutes: 10,
      reminderSound: true,
      reminderVibration: true,
      reminderVolume: 70,
      reminderForOther: true,

      documente: [],
    });
  };

  const stergeProgramare = (id: number) =>
    setProgramari((prev) => prev.filter((p) => p.id !== id));

  const salveazaModificariPopup = () => {
    if (!popupProgramare) return;
    setProgramari((prev) =>
      prev.map((p) => (p.id === popupProgramare.id ? popupProgramare : p))
    );
    setPopupProgramare(null);
  };

  const descriereReminder = (p: Programare) => {
    let parts = [];
    if (p.reminderSound) parts.push("sunet");
    if (p.reminderVibration) parts.push("vibrație");
    return `Reminder cu ${p.reminderMinutes} minute înainte (${parts.join(", ")})`;
  };
  return (
    <main className="min-h-screen bg-amber-50 p-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-amber-900 mb-8 text-center">
        Programări
      </h1>

      <Link
        href="/programari/calendar"
        className="mb-6 px-6 py-3 bg-amber-600 text-white rounded-xl text-lg font-semibold hover:bg-amber-700 transition"
      >
        📅 Vezi Calendarul
      </Link>

      {/* FORMULAR */}
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg border border-amber-300 mb-10">
        <h2 className="text-2xl font-bold text-amber-900 mb-4 text-center">
          Adaugă o programare
        </h2>

        {/* POZA */}
        <div className="flex flex-col items-center mb-4">
          {formular.poza && (
            <img
              src={formular.poza}
              className="w-24 h-24 rounded-full object-cover border border-amber-400 mb-3"
            />
          )}

          <input
            type="file"
            accept="image/*"
            id="uploadPozaFormular"
            onChange={(e) =>
              e.target.files && incarcaPozaFormular(e.target.files[0])
            }
            className="hidden"
          />

          <label
            htmlFor="uploadPozaFormular"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-lg cursor-pointer hover:bg-amber-700 transition"
          >
            📸 Adaugă imagine
          </label>
        </div>

        {/* NUME */}
        <label className="block text-lg font-semibold text-amber-900 mb-1">
          Nume / Instituție
        </label>
        <input
          type="text"
          value={formular.nume}
          onChange={(e) =>
            setFormular((prev) => ({ ...prev, nume: e.target.value }))
          }
          placeholder="Ex: Doctor Popescu / Service Auto"
          className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 text-black"
        />

        {/* TELEFON */}
        <label className="block text-lg font-semibold text-amber-900 mb-1">
          Telefon
        </label>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={formular.telefon}
          onChange={(e) => {
            const doarCifre = e.target.value.replace(/[^0-9]/g, "");
            setFormular((prev) => ({ ...prev, telefon: doarCifre }));
          }}
          placeholder="07xx xxx xxx"
          className="w-full p-3 mb-4 text-lg rounded-xl border border-amber-300 text-black"
        />

        {/* DATA */}
        <label className="block text-lg font-semibold text-amber-900 mb-1">
          Data
        </label>
        <input
          type="date"
          value={formular.data}
          onChange={(e) =>
            setFormular((prev) => ({ ...prev, data: e.target.value }))
          }
          className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 text-black"
        />

        {/* ORA */}
        <label className="block text-lg font-semibold text-amber-900 mb-1">
          Ora
        </label>
        <input
          type="time"
          value={formular.ora}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9:]/g, "");
            setFormular((prev) => ({ ...prev, ora: v }));
          }}
          className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 text-black appearance-auto"
        />

        {/* MOTIV */}
        <label className="block text-lg font-semibold text-amber-900 mb-1">
          Motiv / Detalii
        </label>
        <textarea
          value={formular.motiv}
          onChange={(e) =>
            setFormular((prev) => ({ ...prev, motiv: e.target.value }))
          }
          placeholder="Ex: Control medical / Revizie auto"
          className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 text-black"
        />

        {/* DOCUMENTE */}
        <label className="block text-lg font-semibold text-amber-900 mb-2">
          📎 Documente atașate
        </label>

        <input
          type="file"
          id="uploadDocFormular"
          onChange={(e) =>
            e.target.files && adaugaDocumentFormular(e.target.files[0])
          }
          className="hidden"
        />

        <label
          htmlFor="uploadDocFormular"
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm cursor-pointer hover:bg-amber-700 transition"
        >
          Încarcă document
        </label>

        <div className="mt-2 max-h-32 overflow-y-auto">
          {formular.documente.map((doc) => (
            <div
              key={doc.id}
              className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded px-2 py-1 text-sm mb-1"
            >
              <span className="truncate">{doc.name}</span>
              <button
                onClick={() =>
                  setFormular((prev) => ({
                    ...prev,
                    documente: prev.documente.filter((d) => d.id !== doc.id),
                  }))
                }
                className="text-red-600 text-xs font-semibold"
              >
                Șterge
              </button>
            </div>
          ))}
        </div>

        {/* NOTIFICĂRI */}
        <label className="block text-lg font-semibold text-amber-900 mt-4 mb-2">
          🔔 Notificări
        </label>

        <label className="flex items-center gap-2 mb-2 text-amber-900 font-semibold">
          <input
            type="checkbox"
            checked={formular.reminderSound}
            onChange={(e) =>
              setFormular((prev) => ({
                ...prev,
                reminderSound: e.target.checked,
              }))
            }
          />
          Sunet
        </label>

        {/* SLIDER VOLUM */}
        <input
          type="range"
          min="0"
          max="100"
          value={formular.reminderVolume}
          onChange={(e) =>
            setFormular((prev) => ({
              ...prev,
              reminderVolume: Number(e.target.value),
            }))
          }
          className="w-full mb-4 accent-amber-600"
        />

        <label className="flex items-center gap-2 mb-4 text-amber-900 font-semibold">
          <input
            type="checkbox"
            checked={formular.reminderVibration}
            onChange={(e) =>
              setFormular((prev) => ({
                ...prev,
                reminderVibration: e.target.checked,
              }))
            }
          />
          Vibrație
        </label>

        <label className="flex items-center gap-2 mb-4 text-amber-900 font-semibold">
          <input
            type="checkbox"
            checked={formular.reminderForOther}
            onChange={(e) =>
              setFormular((prev) => ({
                ...prev,
                reminderForOther: e.target.checked,
              }))
            }
          />
          Trimite reminder și persoanei programate
        </label>

        {/* SALVARE */}
        <button
          onClick={salveazaProgramareNoua}
          disabled={!formular.nume || !formular.data || !formular.ora}
          className={`w-full py-4 text-xl font-semibold rounded-xl transition ${
            formular.nume && formular.data && formular.ora
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "bg-gray-300 text-gray-500"
          }`}
        >
          💾 Salvează programarea
        </button>
      </div>

      {/* LISTA PROGRAMĂRI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl mb-10">
        {programari.map((p) => (
          <div
            key={p.id}
            className="bg-white p-4 rounded-xl shadow-md border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
            onClick={() => setPopupProgramare(p)}
          >
            <div className="flex items-center gap-3">
              <img
                src={p.poza || "/placeholder.png"}
                className="w-16 h-16 rounded-full object-cover border border-amber-400"
              />
              <div className="flex-1">
                <p className="text-lg font-bold text-amber-900">{p.nume}</p>
                <p className="text-sm text-amber-800">
                  {p.data} • {p.ora}
                </p>
                <p className="text-xs text-amber-700">{descriereReminder(p)}</p>
                {p.documente.length > 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    {p.documente.length} document(e)
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-3">
              <button className="px-3 py-1 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
                Vezi detalii
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stergeProgramare(p.id);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >
                Șterge
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* POP-UP EDITARE */}
      {popupProgramare && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={() => setPopupProgramare(null)}
        >
          <div
            className="bg-amber-100 p-6 rounded-2xl shadow-xl w-full max-w-md relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPopupProgramare(null)}
              className="absolute top-3 right-3 text-3xl font-bold text-amber-800 hover:text-red-600"
            >
              ×
            </button>

            {/* POZA POPUP */}
            <div className="flex flex-col items-center mb-4">
              {popupProgramare.poza && (
                <img
                  src={popupProgramare.poza}
                  className="w-28 h-28 rounded-full object-cover border border-amber-400 mb-3"
                />
              )}

              <input
                type="file"
                accept="image/*"
                id="uploadPozaPopup"
                onChange={(e) =>
                  e.target.files && incarcaPozaPopup(e.target.files[0])
                }
                className="hidden"
              />

              <label
                htmlFor="uploadPozaPopup"
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-lg cursor-pointer hover:bg-amber-700 transition"
              >
                📸 Schimbă imaginea
              </label>
            </div>

            {/* NUME */}
            <label className="block text-lg font-semibold text-amber-900 mb-1">
              Nume / Instituție
            </label>
            <input
              type="text"
              value={popupProgramare.nume}
              onChange={(e) =>
                setPopupProgramare({
                  ...popupProgramare,
                  nume: e.target.value,
                })
              }
              className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 text-black"
            />

            {/* DATA */}
            <label className="block text-lg font-semibold text-amber-900 mb-1">
              Data
            </label>
            <input
              type="date"
              value={popupProgramare.data}
              onChange={(e) =>
                setPopupProgramare({
                  ...popupProgramare,
                  data: e.target.value,
                })
              }
              className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 text-black"
            />

            {/* ORA */}
            <label className="block text-lg font-semibold text-amber-900 mb-1">
              Ora
            </label>
            <input
              type="time"
              value={popupProgramare.ora}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9:]/g, "");
                setPopupProgramare({
                  ...popupProgramare,
                  ora: v,
                });
              }}
              className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 text-black appearance-auto"
            />

            {/* MOTIV */}
            <label className="block text-lg font-semibold text-amber-900 mb-1">
              Motiv / Detalii
            </label>
            <textarea
              value={popupProgramare.motiv}
              onChange={(e) =>
                setPopupProgramare({
                  ...popupProgramare,
                  motiv: e.target.value,
                })
              }
              className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 text-black"
            />

            {/* TELEFON */}
            <label className="block text-lg font-semibold text-amber-900 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={popupProgramare.telefon}
              onChange={(e) => {
                const doarCifre = e.target.value.replace(/[^0-9]/g, "");
                setPopupProgramare({
                  ...popupProgramare,
                  telefon: doarCifre,
                });
              }}
              className="w-full p-3 mb-4 text-lg rounded-xl border border-amber-300 text-black"
            />

            {/* DOCUMENTE POPUP */}
            <label className="block text-lg font-semibold text-amber-900 mb-2">
              📎 Documente atașate
            </label>

            <input
              type="file"
              id="uploadDocPopup"
              onChange={(e) =>
                e.target.files && adaugaDocumentPopup(e.target.files[0])
              }
              className="hidden"
            />

            <label
              htmlFor="uploadDocPopup"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm cursor-pointer hover:bg-amber-700 transition"
            >
              Încarcă document
            </label>

            <div className="mt-2 max-h-32 overflow-y-auto">
              {popupProgramare.documente.map((doc) => (
                <div
                  key={doc.id}
                  className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded px-2 py-1 text-sm mb-1"
                >
                  <a
                    href={doc.url}
                    target="_blank"
                    className="truncate underline text-amber-900"
                  >
                    {doc.name}
                  </a>
                  <button
                    onClick={() => stergeDocumentPopup(doc.id)}
                    className="text-red-600 text-xs font-semibold"
                  >
                    Șterge
                  </button>
                </div>
              ))}
            </div>

            {/* NOTIFICĂRI POPUP */}
            <label className="block text-lg font-semibold text-amber-900 mt-4 mb-2">
              🔔 Notificări
            </label>

            <label className="flex items-center gap-2 mb-2 text-amber-900 font-semibold">
              <input
                type="checkbox"
                checked={popupProgramare.reminderSound}
                onChange={(e) =>
                  setPopupProgramare({
                    ...popupProgramare,
                    reminderSound: e.target.checked,
                  })
                }
              />
              Sunet
            </label>

            {/* SLIDER VOLUM POPUP */}
            <input
              type="range"
              min="0"
              max="100"
              value={popupProgramare.reminderVolume}
              onChange={(e) =>
                setPopupProgramare({
                  ...popupProgramare,
                  reminderVolume: Number(e.target.value),
                })
              }
              className="w-full mb-4 accent-amber-600"
            />

            <label className="flex items-center gap-2 mb-4 text-amber-900 font-semibold">
              <input
                type="checkbox"
                checked={popupProgramare.reminderVibration}
                onChange={(e) =>
                  setPopupProgramare({
                    ...popupProgramare,
                    reminderVibration: e.target.checked,
                  })
                }
              />
              Vibrație
            </label>

            {/* BUTOANE */}
            <div className="flex gap-4 mb-4 mt-4">
              <a
                href={`tel:${popupProgramare.telefon}`}
                className="flex-1 py-3 text-lg font-semibold rounded-xl bg-green-600 text-white text-center hover:bg-green-700 transition"
              >
                📞 Sună
              </a>
              <a
                href={`https://wa.me/${popupProgramare.telefon}`}
                className="flex-1 py-3 text-lg font-semibold rounded-xl bg-emerald-500 text-white text-center hover:bg-emerald-600 transition"
              >
                💬 WhatsApp
              </a>
            </div>

            <button
  onClick={salveazaModificariPopup}
  className="w-full py-3 text-lg font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700"
>
  💾 Salvează modificările
</button>

</div>

</div>

      )}
    </main>
  );
}
