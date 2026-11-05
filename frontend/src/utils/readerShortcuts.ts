
export function shouldIgnoreReaderShortcut(
  event: KeyboardEvent
): boolean {
  // Leave browser shortcuts and other handled events alone.
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return true
  }

  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return false
  }

  // Don't change pages while someone is typing
  // or navigating an input control.
  return (
    target.isContentEditable ||
    target.closest(
      'input, textarea, select, [contenteditable], [role="textbox"], [role="combobox"], [role="slider"]'
    ) !== null
  )
}
