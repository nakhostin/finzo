import { useMemo, useState, type MouseEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import { Plus, Pencil } from "lucide-react";
import { db } from "@/db/db";
import { listPeople } from "@/db/repositories/people";
import { Button } from "@/components/ui/button";
import { formatRial } from "@/lib/format";
import { cardLinkClassName } from "@/lib/cardStyles";
import { PersonForm } from "@/features/people/PersonForm";
import type { Person } from "@/types/entities";

export function PeoplePage() {
  const people = useLiveQuery(() => listPeople(), [], []);
  const allEntries = useLiveQuery(() => db.ledgerEntries.toArray(), [], []);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);

  const balanceByPerson = useMemo(() => {
    const map = new Map<string, { owedByMe: number; owedToMe: number }>();
    for (const entry of allEntries ?? []) {
      if (!entry.personId || entry.status === "paid" || entry.status === "skipped") continue;
      const amount = entry.amountActual ?? entry.amountPlanned;
      const current = map.get(entry.personId) ?? { owedByMe: 0, owedToMe: 0 };
      if (entry.type === "receivable") current.owedToMe += amount;
      else if (entry.type === "debt" || entry.type === "installment") current.owedByMe += amount;
      map.set(entry.personId, current);
    }
    return map;
  }, [allEntries]);

  const openCreate = () => {
    setEditingPerson(undefined);
    setFormOpen(true);
  };

  const openEdit = (person: Person, e: MouseEvent) => {
    e.preventDefault();
    setEditingPerson(person);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">اشخاص</h2>
        <Button onClick={openCreate}>
          <Plus size={16} />
          افزودن شخص جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(people ?? []).map((person) => {
          const balance = balanceByPerson.get(person.id);
          return (
            <Link
              key={person.id}
              to={`/people/${person.id}`}
              className={cardLinkClassName}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{person.name}</h3>
                <button
                  type="button"
                  onClick={(e) => openEdit(person, e)}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Pencil size={14} />
                </button>
              </div>
              {person.notes && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{person.notes}</p>
              )}
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-red-600 dark:text-red-400">
                  بدهی من: {formatRial(balance?.owedByMe ?? 0)}
                </p>
                <p className="text-emerald-600 dark:text-emerald-400">
                  طلب من: {formatRial(balance?.owedToMe ?? 0)}
                </p>
              </div>
            </Link>
          );
        })}
        {people && people.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            هنوز شخصی ثبت نشده است.
          </p>
        )}
      </div>

      <PersonForm
        open={formOpen}
        onOpenChange={setFormOpen}
        person={editingPerson}
        onSaved={() => setFormOpen(false)}
      />
    </div>
  );
}
