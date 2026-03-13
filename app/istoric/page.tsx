export default function Istoric() {
  const programari = [
    {
      id: 1,
      nume: "Ion Popescu",
      data: "2024-02-10",
      ora: "10:00",
    },
    {
      id: 2,
      nume: "Maria Ionescu",
      data: "2024-02-12",
      ora: "14:30",
    },
    {
      id: 3,
      nume: "Vasile Georgescu",
      data: "2024-02-15",
      ora: "09:15",
    },
  ];

  return (
    <main className="min-h-screen bg-amber-50 p-6">
      <h1 className="text-4xl font-bold text-amber-900 mb-8 text-center">
        Istoric programări
      </h1>

      <div className="space-y-6 max-w-xl mx-auto">
        {programari.map((item) => (
          <div
            key={item.id}
            className="bg-white p-6 rounded-2xl shadow-lg border border-amber-200"
          >
            <h2 className="text-2xl font-bold text-amber-900 mb-2">
              {item.nume}
            </h2>

            <p className="text-lg text-amber-800">
              <span className="font-semibold">Data:</span> {item.data}
            </p>

            <p className="text-lg text-amber-800">
              <span className="font-semibold">Ora:</span> {item.ora}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
