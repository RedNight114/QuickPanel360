import { useId } from 'react';
import { clsx } from 'clsx';

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Field({ label, error, className, id: externalId, ...props }: FieldProps) {
  const autoId = useId();
  const id = externalId ?? autoId;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={clsx(
          'mt-1.5 h-11 w-full rounded-lg border px-3 text-text-primary outline-none transition',
          'bg-white',
          error
            ? 'border-status-danger focus:border-status-danger focus:ring-2 focus:ring-status-danger/20'
            : 'border-border-light placeholder:text-text-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-status-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
