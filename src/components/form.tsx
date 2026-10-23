"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
};

const inputClass =
  "rounded-lg border border-border bg-surface px-3 py-2.5 text-base font-normal outline-none focus:border-foreground aria-invalid:border-red-500";

export function Field({ label, name, error, className, ...props }: FieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        name={name}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={`${inputClass} ${className ?? ""}`}
        {...props}
      />
      {error && (
        <span id={errorId} className="text-xs font-normal text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
    >
      {pending ? "Patiente…" : children}
    </button>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error)
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  if (message)
    return (
      <p role="status" className="text-sm text-muted">
        {message}
      </p>
    );
  return null;
}
