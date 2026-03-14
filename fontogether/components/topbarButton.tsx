import { ChevronDown } from "lucide-react";

interface TopbarButtonTrait {
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}

interface TopbarDropdownButtonTrait {
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function TopbarButton({ disabled = false, selected = false, onClick = () => {}, title = "", children }: TopbarButtonTrait) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-9 p-2 bg-white text-black dark:bg-black dark:text-white rounded-full shadow-md dark:shadow-zinc-800 leading-none disabled:opacity-25 ${selected ? "bg-gray-200 dark:bg-zinc-700" : disabled ? "" : "hover:bg-gray-100 dark:hover:bg-zinc-900 active:bg-gray-200 dark:active:bg-zinc-800 outline-none"}`}
    >
      {children}
    </button>
  )
}

export function TopbarDropdownButton({ disabled = false, onClick = () => {}, title = "", children }: TopbarDropdownButtonTrait) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-9 p-2 pr-1 flex flex-row gap-1 items-center relative bg-white text-black dark:bg-black dark:text-white rounded-full shadow-md dark:shadow-zinc-800 leading-none disabled:opacity-25 hover:bg-gray-100 dark:hover:bg-zinc-900 active:bg-gray-200 dark:active:bg-zinc-800`}
    >
      {children}
      <ChevronDown size={12} />
    </button>
  )
}

export function TopbarButtonGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-9 p-1 flex flex-row gap-1 bg-white text-black dark:bg-black dark:text-white rounded-full shadow-md dark:shadow-zinc-800 leading-none">
      {children}
    </div>
  )
}

export function TopbarGroupedButton({ disabled = false, selected = false, onClick = () => {}, title = "", children }: TopbarButtonTrait) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-7 p-1 rounded-full leading-none disabled:opacity-25 ${selected ? "bg-gray-200 dark:bg-zinc-700" : disabled ? "" : "hover:bg-gray-100 dark:hover:bg-zinc-900 active:bg-gray-200 dark:active:bg-zinc-800 outline-none"}`}
    >
      {children}
    </button>
  )
}
