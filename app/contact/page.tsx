"use client";

import { useState } from "react";

export default function Contact() {
  const [contacte, setContacte] = useState<
    { id: number; eticheta: string; nume: string; telefon: string; poza: string | null }[]
  >([]);

  const [popupContact, setPopupContact] = useState<{
    id: number;
    eticheta: string;
    nume: string;
    telefon: string;
    poza: string | null;
  } | null>(null);

  const [formular, setFormular] = useState<{
    eticheta: string;
    nume: string;
    telefon: string;
    poza: string | null;
  }>({
    eticheta: "",
    nume: "",
    telefon: "",
    poza: null,
  });

  // Încărcare poză în formularul principal
  const incarcaPozaFormular = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormular({ ...formular, poza: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  // Încărcare poză în pop-up
  const incarcaPozaPopup = (id: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setContacte(
        contacte.map((c) =>
          c.id === id ? { ...c, poza: reader.result as string } : c
        )
      );
      if (popupContact) {
        setPopupContact({ ...popupContact, poza: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  // Salvare contact nou
  const salveazaContactNou = () => {
    if (!formular.telefon) return;

    setContacte([
      ...contacte,
      {
        id: Date.now(),
        eticheta: formular.eticheta,
        nume: formular.nume,
        telefon: formular.telefon,
        poza: formular.poza,
      },
    ]);

    setFormular({
      eticheta: "",
      nume: "",
      telefon: "",
      poza: null,
    });
  };

  // Ștergere contact
  const stergeContact = (id: number) => {
    setContacte(contacte.filter((c) => c.id !== id));
  };

  // Salvare modificări în pop-up
  const salveazaModificariPopup = () => {
    if (!popupContact) return;

    setContacte(
      contacte.map((c) =>
        c.id === popupContact.id ? popupContact : c
      )
    );
    setPopupContact(null);
  };

  return (
    <main className="min-h-screen bg-amber-50 p-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-amber-900 mb-8 text-center">
        Contacte utile
      </h1>

      {/* CARD PRINCIPAL */}
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg border border-amber-300 mb-10">
        <h2 className="text-2xl font-bold text-amber-900 mb-4 text-center">
          Adaugă un contact
        </h2>

        {/* Poză */}
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
              incarcaPozaFormular(e.target.files?.[0] ?? null)
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

        {/* Persoană / Rol */}
        <label className="block text-lg font-semibold text-amber-900 mb-1">
          Persoană / Rol
        </label>
        <input
          type="text"
          value={formular.eticheta}
          onChange={(e) =>
            setFormular({ ...formular, eticheta: e.target.value })
          }
          className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 text-black"
        />

        {/* Nume */}
        <label className="block text-lg font-semibold text-amber-900 mb-1">
          Nume
        </label>
        <input
          type="text"
          value={formular.nume}
          onChange={(e) =>
            setFormular({ ...formular, nume: e.target.value })
          }
          className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 text-black"
        />

        {/* Telefon */}
        <label className="block text-lg font-semibold text-amber-900 mb-1">
          Număr de telefon
        </label>
        <input
          type="tel"
          value={formular.telefon}
          onChange={(e) =>
            setFormular({ ...formular, telefon: e.target.value })
          }
          className="w-full p-3 mb-4 text-lg rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 text-black"
        />

        {/* Buton Salvează */}
        <button
          onClick={salveazaContactNou}
          disabled={!formular.telefon}
          className={`w-full py-4 text-xl font-semibold rounded-xl transition ${
            formular.telefon
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "bg-gray-300 text-gray-500"
          }`}
        >
          💾 Salvează contactul
        </button>
      </div>

      {/* GRILĂ CARDURI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
        {contacte.map((c) => (
          <div
            key={c.id}
            className="bg-white p-4 rounded-xl shadow-md border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
            onClick={() => setPopupContact(c)}
          >
            <div className="flex items-center gap-3">
              <img
                src={c.poza || "/placeholder.png"}
                className="w-16 h-16 rounded-full object-cover border border-amber-400"
              />

              <div className="flex-1">
                <p className="text-lg font-bold text-amber-900">{c.eticheta}</p>
                <p className="text-md text-amber-800">{c.nume}</p>
                <p className="text-sm text-amber-700">{c.telefon}</p>
              </div>
            </div>

            <div className="flex justify-between mt-3">
              <button className="px-3 py-1 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
                Contactează
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stergeContact(c.id);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >
                Șterge
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* POP-UP */}
      {popupContact && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4"
          onClick={() => setPopupContact(null)}
        >
          <div
            className="bg-amber-100 p-6 rounded-2xl shadow-xl w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPopupContact(null)}
              className="absolute top-3 right-3 text-3xl font-bold text-amber-800 hover:text-red-600"
            >
              ×
            </button>

            {/* Poză */}
            <div className="flex flex-col items-center mb-4">
              {popupContact.poza && (
                <img
                  src={popupContact.poza}
                  className="w-28 h-28 rounded-full object-cover border border-amber-400 mb-3"
                />
              )}

              <input
                type="file"
                accept="image/*"
                id="uploadPozaPopup"
                onChange={(e) =>
                  incarcaPozaPopup(
                    popupContact.id,
                    e.target.files?.[0] ?? null
                  )
                }
                className="hidden"
              />

              <label
                htmlFor="uploadPozaPopup"
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-lg cursor-pointer hover:bg-amber-700 transition"
              >
                📸 Adaugă imagine
              </label>
            </div>

            {/* Persoană / Rol */}
            <label className="block text-lg font-semibold text-amber-900 mb-1">
              Persoană / Rol
            </label>
            <input
              type="text"
              value={popupContact.eticheta}
              onChange={(e) =>
                setPopupContact({ ...popupContact, eticheta: e.target.value })
              }
              className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 text-black"
            />

            {/* Nume */}
            <label className="block text-lg font-semibold text-amber-900 mb-1">
              Nume
            </label>
            <input
              type="text"
              value={popupContact.nume}
              onChange={(e) =>
                setPopupContact({ ...popupContact, nume: e.target.value })
              }
              className="w-full p-3 mb-3 text-lg rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 text-black"
            />

            {/* Telefon */}
            <label className="block text-lg font-semibold text-amber-900 mb-1">
              Număr de telefon
            </label>
            <input
              type="tel"
              value={popupContact.telefon}
              onChange={(e) =>
                setPopupContact({ ...popupContact, telefon: e.target.value })
              }
              className="w-full p-3 mb-4 text-lg rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 text-black"
            />

            {/* Butoane */}
            <div className="flex gap-4">
              <a
                href={`tel:${popupContact.telefon}`}
                className="flex-1 py-4 text-xl font-semibold rounded-xl bg-green-600 text-white text-center hover:bg-green-700 transition"
              >
                📞 Sună
              </a>
              <a
                href={`https://wa.me/${popupContact.telefon}`}
                className="flex-1 py-4 text-xl font-semibold rounded-xl bg-emerald-500 text-white text-center hover:bg-emerald-600 transition"
              >
                💬 WhatsApp
              </a>
            </div>

            <button
              onClick={salveazaModificariPopup}
              className="w-full mt-4 py-3 text-lg font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700"
            >
              💾 Salvează modificările
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
