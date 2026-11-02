import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={96}
      toastOptions={{
        classNames: {
          toast: '!rounded-[10px] !border-0 !bg-foreground !text-white !shadow-[0_12px_32px_rgba(14,23,38,0.25)] !text-[13.5px]',
          description: '!text-white/75',
          actionButton: '!bg-white/15 !text-white !font-semibold',
          error: '!bg-expense-ink',
        },
      }}
    />
  )
}
