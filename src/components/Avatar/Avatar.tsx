interface Props {
  url?: string | null
  name: string
  /** Size (and any extra) classes, e.g. "h-10 w-10". */
  className?: string
  /** Text size class for the initial fallback. */
  textClassName?: string
}

/** Profile avatar: shows the photo if set, otherwise the name's initial. */
export function Avatar({ url, name, className = 'h-10 w-10', textClassName = 'text-base' }: Props) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${className} rounded-full object-cover`}
      />
    )
  }
  return (
    <div
      className={`${className} flex items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 ${textClassName}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
