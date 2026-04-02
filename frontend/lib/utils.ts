import { clsx } from 'clsx';

export const cn = (...inputs: Array<string | false | null | undefined>) => clsx(inputs);

export const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short'
  }).format(new Date(value));

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
