import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { validierungsFehler, ueberschneidung } from "@/api/client";
import { toast } from "sonner";
import { Plus, RotateCw } from "lucide-react";
export function Heading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Loading({
  result,
  children,
}: {
  result: { loading: boolean; error: Error | undefined; reload: () => void };
  children: ReactNode;
}) {
  if (result.loading)
    return (
      <div className="property-grid">
        {[1, 2, 3].map((i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
    );
  if (result.error)
    return (
      <div className="empty-state">
        <p>Die Daten konnten nicht geladen werden.</p>
        <Button variant="outline" className="mt-4" onClick={result.reload}>
          <RotateCw />
          Erneut versuchen
        </Button>
      </div>
    );
  return children;
}
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: Record<string, string>;
  required?: boolean;
};
// The form is untyped at this boundary: it mixes text inputs, selects and row
// lists (see `extra`), and `prepare` turns them into the API input, which the
// save function (an API hook) checks against the serializer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Untyped = any;
export type FormValues = Record<string, Untyped>;
export function Editor({
  title,
  fields,
  initial = {},
  save,
  onSaved,
  trigger,
  extra,
  prepare,
}: {
  title: string;
  fields: Field[];
  initial?: FormValues;
  save: (data: Untyped) => Promise<unknown>;
  onSaved: () => void;
  trigger?: ReactNode;
  extra?: (data: FormValues, set: (d: FormValues) => void) => ReactNode;
  prepare?: (data: FormValues) => Untyped;
}) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState(initial),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState<ReturnType<typeof ueberschneidung>>();
  async function submit(force = false) {
    setBusy(true);
    setErrors({});
    try {
      const payload = prepare ? prepare(data) : data;
      await save(force ? { ...payload, aelteren_beenden: true } : payload);
      toast.success("Gespeichert");
      setOpen(false);
      setConflict(undefined);
      onSaved();
    } catch (e) {
      const c = ueberschneidung(e);
      if (c) setConflict(c);
      else
        setErrors(
          Object.fromEntries(
            Object.entries(
              validierungsFehler(e) ?? {
                "":
                  e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
              },
            ).map(([key, value]) => [
              key.startsWith("mieter.")
                ? key.slice(7)
                : key === "non_field_errors"
                  ? ""
                  : key,
              value,
            ]),
          ),
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span
        onClick={() => {
          setData(initial);
          setErrors({});
          setOpen(true);
        }}
      >
        {trigger ?? (
          <Button>
            <Plus />
            Neu anlegen
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Angaben zum{" "}
              {title
                .toLowerCase()
                .replace(" bearbeiten", "")
                .replace(" anlegen", "")}
              .
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="form-grid">
              {fields.map((f) => (
                <label key={f.key}>
                  {f.label}
                  {f.options ? (
                    <select
                      aria-label={f.label}
                      className="field-input"
                      value={data[f.key] ?? ""}
                      required={f.required}
                      onChange={(e) =>
                        setData({ ...data, [f.key]: e.target.value })
                      }
                    >
                      <option value="">Bitte auswählen</option>
                      {Object.entries(f.options).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      aria-label={f.label}
                      className="field-input"
                      type={f.type ?? "text"}
                      value={data[f.key] ?? ""}
                      required={f.required}
                      onChange={(e) =>
                        setData({ ...data, [f.key]: e.target.value })
                      }
                    />
                  )}{" "}
                  {errors[f.key] && (
                    <span className="form-error">{errors[f.key]}</span>
                  )}
                </label>
              ))}
            </div>
            {extra?.(data, setData)}
            {Object.entries(errors)
              .filter(([key]) => !fields.some((f) => f.key === key))
              .map(([key, v]) => (
                <p key={key} className="form-error mt-3">
                  {v}
                </p>
              ))}
            {conflict && (
              <div className="mt-5 border rounded-md p-4">
                <h3 className="font-semibold">Überschneidende Mietverträge</h3>
                {conflict.konflikte.map((c) => (
                  <p className="text-sm mt-2" key={c.id}>
                    {c.mieter_name} · {c.einheit_label} ·{" "}
                    {c.beginn.split("-").reverse().join(".")} –{" "}
                    {c.ende?.split("-").reverse().join(".") ?? "unbefristet"}
                  </p>
                ))}
                {conflict.kann_beenden ? (
                  <Button
                    type="button"
                    className="mt-4"
                    disabled={busy}
                    onClick={() => submit(true)}
                  >
                    Ältere Verträge beenden und speichern
                  </Button>
                ) : (
                  <p className="form-error mt-3">
                    Ein Vertrag beginnt am oder nach dem neuen Beginn. Bitte
                    manuell anpassen.
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-7">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Wird gespeichert …" : "Speichern"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function ConfirmDelete({
  label = "Löschen",
  onDelete,
}: {
  label?: string;
  onDelete: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
        </svg>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogDescription>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await onDelete();
                  toast.success(label + ": erfolgreich");
                  setOpen(false);
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Löschen fehlgeschlagen",
                  );
                }
              }}
            >
              Endgültig löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty-state">Keine Einträge vorhanden.</div>
      )}
    </div>
  );
}
export const metadata = (title: string) => ({
  meta: [
    { title: title + " · Immobilienverwaltung" },
    {
      name: "description",
      content: title + " – Ihr Immobilienportfolio übersichtlich verwalten.",
    },
    { property: "og:title", content: title + " · Immobilienverwaltung" },
    {
      property: "og:description",
      content: title + " – Ihr Immobilienportfolio übersichtlich verwalten.",
    },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
