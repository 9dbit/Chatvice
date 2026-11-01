import {forwardRef, useEffect, useRef, useState, type ComponentPropsWithoutRef, type ElementRef} from "react";
import * as Primitive from "@radix-ui/react-dialog";
import {X, FileText} from "lucide-react";

export const Dialog = Primitive.Root;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
type ContentProps = ComponentPropsWithoutRef<typeof Primitive.Content> & {
  variant?: "dialog" | "drawer"; closeDisabled?: boolean; elevated?: boolean;
};
export const DialogContent = forwardRef<ElementRef<typeof Primitive.Content>, ContentProps>(
  function MailDialog({children, className = "", variant = "dialog", closeDisabled, elevated, ...props}, ref) {
    return <Primitive.Portal><Primitive.Overlay className={`mail-modal-overlay ${elevated ? "mail-confirm-overlay" : ""}`}/>
      <Primitive.Content ref={ref} className={`mail-modal mail-modal-${variant} ${className}`} {...props}>
        {children}
        <Primitive.Close className="mail-modal-close mail-icon-btn" aria-label="Close" disabled={closeDisabled}><X size={18}/></Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>;
  }
);

type Confirmation = {title?: string; description: string; confirm?: string; cancel?: string};
/** Only one confirmation can be pending; dismissal never confirms an action. */
export function useMailConfirm() {
  const [question, setQuestion] = useState<Confirmation | null>(null);
  const pending = useRef<((answer: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => {pending.current?.(false); pending.current = null;}, []);
  function finish(answer: boolean) {
    const resolve = pending.current; pending.current = null; setQuestion(null); resolve?.(answer);
  }
  function confirm(options: Confirmation) {
    if (pending.current) return Promise.resolve(false);
    setQuestion(options);
    return new Promise<boolean>(resolve => {pending.current = resolve;});
  }
  const confirmation = <Dialog open={Boolean(question)} onOpenChange={open => {if (!open) finish(false);}}>
    <DialogContent elevated className="mail-confirm" role="alertdialog" onOpenAutoFocus={event => {event.preventDefault(); cancelRef.current?.focus();}}>
      <span className="mail-dialog-symbol"><FileText size={24}/></span>
      <DialogTitle>{question?.title || "Discard unsaved changes?"}</DialogTitle>
      <DialogDescription>{question?.description}</DialogDescription>
      <div className="mail-modal-actions"><button ref={cancelRef} className="mail-button" onClick={() => finish(false)}>{question?.cancel || "Keep editing"}</button>
        <button className="mail-button mail-primary" onClick={() => finish(true)}>{question?.confirm || "Discard changes"}</button></div>
    </DialogContent>
  </Dialog>;
  return {confirm, confirmation};
}
