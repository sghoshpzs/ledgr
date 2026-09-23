const paths: Record<string, string> = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  invest: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  debts: 'M3 6h18v12H3zM3 10h18M7 15h4',
  credits: 'M12 3v13M6 11l6 6 6-6M5 21h14',
  monthly: 'M12 3a9 9 0 1 0 9 9h-9zM15 3.5A9 9 0 0 1 20.5 9H15z',
  items: 'M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5zM9 12l2 2 4-4',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
}

export function Icon({ name, size = 22 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
