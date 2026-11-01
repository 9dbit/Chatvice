import hero from "../assets/mail-retro/hero.webp";
import inbox from "../assets/mail-retro/inbox.webp";
import secure from "../assets/mail-retro/secure.webp";

const artwork = {hero, inbox, secure};
/** Decorative, same-origin artwork. Message content never supplies image URLs. */
export default function MailArt({kind, className = "", eager = false}: {
  kind: keyof typeof artwork; className?: string; eager?: boolean;
}) {
  return <img className={`mail-retro-art ${className}`} src={artwork[kind]} alt=""
    width={kind === "hero" ? 1000 : 700} height={kind === "hero" ? 1000 : 700}
    loading={eager ? "eager" : "lazy"} decoding="async" draggable={false}/>;
}
