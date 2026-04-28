"use client";

import { useMemo, useState } from "react";
import { Building2, Users, Wrench } from "lucide-react";

const BUILDINGS = [
  { id: 1, name: "Green Tower", address1: "12 Lake View", address2: "Gulshan", postCode: "1212" },
  { id: 2, name: "Blue Heights", address1: "88 Central Road", address2: "Banani", postCode: "1213" },
];

const FLATS = [
  { id: 1, buildingId: 1, flatNo: "A-1" },
  { id: 2, buildingId: 1, flatNo: "A-2" },
  { id: 3, buildingId: 2, flatNo: "B-1" },
];

export default function AdminPage() {
  const [buildingId, setBuildingId] = useState<number>(1);
  const selectedBuilding = useMemo(
    () => BUILDINGS.find((item) => item.id === buildingId),
    [buildingId],
  );
  const buildingFlats = useMemo(
    () => FLATS.filter((item) => item.buildingId === buildingId),
    [buildingId],
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4"><Building2 className="mb-2 h-4 w-4" />Buildings CRUD</div>
        <div className="rounded-xl border p-4"><Users className="mb-2 h-4 w-4" />Users & Staff CRUD</div>
        <div className="rounded-xl border p-4"><Wrench className="mb-2 h-4 w-4" />System Config CRUD</div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-4 font-semibold">Create Standard User</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Building
            <select
              className="mt-1 w-full rounded-md border p-2"
              value={buildingId}
              onChange={(e) => setBuildingId(Number(e.target.value))}
            >
              {BUILDINGS.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Flat/Apartment
            <select className="mt-1 w-full rounded-md border p-2">
              {buildingFlats.map((flat) => (
                <option key={flat.id} value={flat.id}>
                  {flat.flatNo}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">Address-1<input className="mt-1 w-full rounded-md border p-2" value={selectedBuilding?.address1 ?? ""} readOnly /></label>
          <label className="text-sm">Address-2<input className="mt-1 w-full rounded-md border p-2" value={selectedBuilding?.address2 ?? ""} readOnly /></label>
          <label className="text-sm">Post Code<input className="mt-1 w-full rounded-md border p-2" value={selectedBuilding?.postCode ?? ""} readOnly /></label>
          <label className="text-sm">Gas Meter No<input className="mt-1 w-full rounded-md border p-2" placeholder="GM-XXXX" /></label>
        </div>
      </section>
    </main>
  );
}
