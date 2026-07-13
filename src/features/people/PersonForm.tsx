import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addPerson, updatePerson } from "@/db/repositories/people";
import type { Person } from "@/types/entities";

interface PersonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: Person;
  onSaved: () => void;
}

export function PersonForm({ open, onOpenChange, person, onSaved }: PersonFormProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setName(person?.name ?? "");
      setNotes(person?.notes ?? "");
      setError(undefined);
    }
  }, [open, person]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("نام الزامی است");
      return;
    }
    if (person) {
      await updatePerson(person.id, { name: name.trim(), notes: notes.trim() || undefined });
    } else {
      const created = await addPerson(name.trim());
      if (notes.trim()) await updatePerson(created.id, { notes: notes.trim() });
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={person ? "ویرایش شخص" : "افزودن شخص جدید"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>نام</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلا: سینا" />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div>
          <Label>توضیحات</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button type="submit">{person ? "ذخیره تغییرات" : "افزودن"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
