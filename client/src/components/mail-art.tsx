import hero from "../assets/mail-glass/hero.webp";
import inbox from "../assets/mail-glass/inbox.webp";
import secure from "../assets/mail-glass/secure.webp";

const artwork = {hero, inbox, secure};
/** Decorative, same-origin artwork. Message content never supplies image URLs. */
export default function MailArt({kind, className = "", eager = false}: {
  kind: keyof typeof artwork; className?: string; eager?: boolean;
}) {
  return <img className={`mail-glass-art ${className}`} src={artwork[kind]} alt=""
    width={kind === "hero" ? 1000 : 700} height={kind === "hero" ? 1000 : 700}
    loading={eager ? "eager" : "lazy"} decoding="async" draggable={false}/>;
}
