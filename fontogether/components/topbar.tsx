export default function Topbar({ ref = () => {}, children }: { ref?: (element: HTMLElement | null) => void, children: React.ReactNode }) {
  return (
    <div ref={ref} className="absolute top-0 z-1000 w-full h-12 p-2 flex flex-row justify-center items-center backdrop-blur-xl border-b border-gray-200 dark:border-zinc-700 gap-2 select-none">
      {children}
    </div>
  )
}
