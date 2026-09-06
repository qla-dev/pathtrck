export const nextInput = (current: HTMLElement): (() => void) => {
  const scope = current.closest('section, form') || document;
  const fields = Array.from(scope.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea'))
    .filter((field) => field.getClientRects().length > 0 && !field.hasAttribute('readonly'));
  const index = fields.indexOf(current);
  const next = fields.slice(index + 1).find((field) => !field.hasAttribute('disabled'));
  return () => {
    let attempts = 0;
    const focus = () => {
      if (!next?.isConnected) return;
      if (document.activeElement !== current && document.activeElement !== document.body) return;
      if (next.hasAttribute('disabled') && attempts++ < 200) {
        window.setTimeout(focus, 25);
        return;
      }
      next.focus();
    };
    window.setTimeout(focus, 0);
  };
};
