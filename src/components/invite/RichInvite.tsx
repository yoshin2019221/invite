/* eslint-disable @next/next/no-img-element */
import "./invite.css";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import RsvpForm from "@/app/[locale]/e/[slug]/RsvpForm";
import { googleCalendarUrl } from "@/lib/calendar";
import { formatTimeOnly, intlLocale, mapLink, type PublicEvent } from "@/lib/events";
import { designPromptToCSS } from "@/lib/design-to-css";
import { sanitizeCSS } from "@/lib/sanitize-css";
import { monogram, richOf } from "@/lib/rich";
import { photoPublicUrl } from "@/lib/supabase/admin";
import { templateFontClass } from "@/lib/template-fonts";
import { templateOf } from "@/lib/templates";
import Countdown from "./Countdown";
import InviteOpener from "./InviteOpener";
import LottieBg from "./LottieBg";
import MusicButton from "./MusicButton";
import Reveal from "./Reveal";

type Props = {
  event: PublicEvent;
  locale: string;
  inviteUrl: string;
  otherLocalePath: string;
  preview?: boolean;
};

function dateParts(iso: string, tz: string, locale: string) {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale(locale), { ...o, timeZone: tz }).format(new Date(iso));
  return {
    weekday: f({ weekday: "long" }),
    day: f({ day: "numeric" }),
    month: f({ month: "long" }),
    year: f({ year: "numeric" }),
    full: f({ weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    short: f({ weekday: "short", day: "numeric", month: "short" }),
  };
}

export default async function RichInvite({ event, locale, inviteUrl, otherLocalePath, preview }: Props) {
  const t = await getTranslations({ locale, namespace: "Rich" });
  const g = await getTranslations({ locale, namespace: "Guest" });
  const occasions = await getTranslations({ locale, namespace: "Occasions" });
  const def = templateOf(event.template);
  const rich = richOf(event.details);
  const photo = photoPublicUrl(event.photo_path);
  const when = dateParts(event.starts_at, event.timezone, locale);
  const time = formatTimeOnly(event.starts_at, event.timezone, locale);
  const c = def.colors;
  const forward = `https://wa.me/?text=${encodeURIComponent(`${g("forwardText", { title: event.title })}\n${inviteUrl}`)}`;
  const map = mapLink(event);
  const showCountdown = rich.countdown;
  const fullCard = rich.heroFullCard && !!photo;
  // AI-generated CSS (custom design) takes priority; legacy full-card invites fall back to keyword-based extraction.
  const hasAiCSS = !!rich.inviteCSS;
  const designCSS = !hasAiCSS && fullCard ? designPromptToCSS(rich.designPrompt) : null;
  const style = {
    "--paper": c.paper, "--paper-deep": c.paperDeep, "--ink": c.ink, "--ink-soft": c.inkSoft,
    "--maroon": c.accent, "--maroon-deep": c.accentDeep, "--saffron": c.highlight,
    // Override with keyword-derived colours when no AI CSS is available
    ...(designCSS?.vars ?? {}),
  } as React.CSSProperties;
  // Sanitise the AI-generated CSS to prevent XSS before injecting.
  const aiCSS = hasAiCSS ? sanitizeCSS(rich.inviteCSS!) : null;
  // Template colours act as defaults (zero specificity) so the custom design's own variables win.
  const defaultVars = `:where(.design-ai){--paper:${c.paper};--paper-deep:${c.paperDeep};--ink:${c.ink};--ink-soft:${c.inkSoft};--maroon:${c.accent};--maroon-deep:${c.accentDeep};--saffron:${c.highlight}}`;

  return (
    <>
    {fullCard && !preview && <InviteOpener slug={event.slug} />}
    <div style={{ ...(hasAiCSS ? {} : style), ...(designCSS?.backgroundCSS ? { background: designCSS.backgroundCSS } : {}) }} className={`tpl tpl-${def.id} ${def.dark ? "tpl-dark" : ""} ${templateFontClass} ${hasAiCSS ? "design-ai" : ""} ${designCSS?.classes.join(" ") ?? ""}`} data-template={def.id}>
      {aiCSS && <style dangerouslySetInnerHTML={{ __html: `${defaultVars}${aiCSS}` }} />}
      {fullCard ? (
        <header className="hero hero-cardfull">
          {/* The card's own colours, blurred, become the backdrop so the frame always blends with it. */}
          <div className="hero-cardfull-bg" style={{ backgroundImage: `url("${photo}")` }} aria-hidden />
          {[
            { left: "12%", top: "22%", delay: "0s" },
            { left: "84%", top: "16%", delay: "1.1s" },
            { left: "76%", top: "70%", delay: "2.2s" },
            { left: "18%", top: "78%", delay: "0.6s" },
            { left: "50%", top: "10%", delay: "1.7s" },
            { left: "90%", top: "46%", delay: "3s" },
          ].map((s, i) => (
            <span key={i} className="hero-cardfull-spark" aria-hidden style={{ left: s.left, top: s.top, animationDelay: s.delay }} />
          ))}
          <div className="hero-top">
            <Link href={otherLocalePath} hrefLang={locale === "en" ? "hi" : "en"} className="lang-chip">{t("switchTo")}</Link>
          </div>
          <div className="hero-cardfull-img">
            {/* The card already shows names, date and venue drawn into the artwork. */}
            <img src={photo!} alt={event.title} />
            <div className="hero-cardfull-shine" aria-hidden />
          </div>
          <div className="hero-cardfull-cta">
            <a href="#rsvp" className="btn-main">{t("replyNow")}</a>
          </div>
          <a href="#details" className="hero-scroll" aria-label={t("heroScroll")}><span /></a>
        </header>
      ) : (
      <header className="hero">
        {photo && <div className="hero-photo"><img src={photo} alt="" /></div>}
        {def.lottie && <LottieBg name={def.lottie} />}
        <div className="hero-top">
          <Link href={otherLocalePath} hrefLang={locale === "en" ? "hi" : "en"} className="lang-chip">{t("switchTo")}</Link>
        </div>
        <div className="hero-body">
          <p className="hero-mono" aria-hidden>{monogram(event.title).join(" · ")}</p>
          <p className="hero-kicker">{occasions(event.occasion)}</p>
          <h1 className="hero-title">{event.title}</h1>
          <p className="hero-hosts">{t("hostedBy", { names: event.host_names })}</p>
          <div className="hero-date">
            <span className="hero-date-day">{when.day}</span>
            <span className="hero-date-rest">{when.month} {when.year}</span>
          </div>
          <p className="hero-time">{when.weekday}, {time}</p>
          <a href="#rsvp" className="btn-main">{t("replyNow")}</a>
        </div>
        <a href="#details" className="hero-scroll" aria-label={t("heroScroll")}><span /></a>
      </header>
      )}

      <main id="details" className="flow">
        {event.message && (
          <Reveal className="sec sec-message">
            <p className="message">{event.message}</p>
          </Reveal>
        )}

        {showCountdown && (
          <Reveal className="sec sec-count">
            <h2 className="sec-title">{t("countdownHeading")}</h2>
            <Countdown
              target={event.starts_at}
              labels={{ days: t("days"), hours: t("hours"), minutes: t("minutes"), seconds: t("seconds") }}
              done={t("countdownDone")}
            />
          </Reveal>
        )}

        {rich.story.length > 0 && (
          <Reveal className="sec sec-story">
            <h2 className="sec-title">{t("storyHeading")}</h2>
            <ol className="story">
              {rich.story.map((s, i) => {
                const sp = photoPublicUrl(s.photo);
                return (
                  <li key={i} className="story-item">
                    <span className="story-dot" aria-hidden />
                    {s.when && <p className="story-when">{s.when}</p>}
                    <h3 className="story-title">{s.title}</h3>
                    {sp && <img src={sp} alt="" loading="lazy" className="story-photo" />}
                    {s.text && <p className="story-text">{s.text}</p>}
                  </li>
                );
              })}
            </ol>
          </Reveal>
        )}

        <Reveal className="sec sec-events">
          <h2 className="sec-title">{t("itineraryHeading")}</h2>
          <ul className="events">
            {(rich.itinerary.length ? rich.itinerary : [{ name: event.title, startsAt: event.starts_at, venue: event.venue_name ?? undefined }]).map((e, i) => {
              const p = e.startsAt ? dateParts(e.startsAt, event.timezone, locale) : null;
              return (
                <li key={i} className="event-card">
                  {p && (
                    <div className="event-date">
                      <span className="event-day">{p.day}</span>
                      <span className="event-month">{p.month}</span>
                    </div>
                  )}
                  <div className="event-info">
                    <h3 className="event-name">{e.name}</h3>
                    {e.startsAt && <p className="event-meta">{p?.weekday}, {formatTimeOnly(e.startsAt, event.timezone, locale)}</p>}
                    {e.venue && <p className="event-meta">{e.venue}</p>}
                    {e.note && <p className="event-note">{e.note}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="btn-row">
            <a href={`/api/v1/events/${event.slug}/calendar?locale=${locale}`} className="btn-ghost">{t("calendar")}</a>
            <a href={googleCalendarUrl(event, inviteUrl)} target="_blank" rel="noreferrer" className="btn-ghost">{t("google")}</a>
          </div>
        </Reveal>

        {(event.venue_name || event.address) && (
          <Reveal className="sec sec-venue">
            <h2 className="sec-title">{t("venueHeading")}</h2>
            {event.venue_name && <p className="venue-name">{event.venue_name}</p>}
            {event.address && <p className="venue-address">{event.address}</p>}
            {map && <a href={map} target="_blank" rel="noreferrer" className="btn-main">{t("map")}</a>}
          </Reveal>
        )}

        {rich.gallery.length > 0 && (
          <Reveal className="sec sec-gallery">
            <h2 className="sec-title">{t("galleryHeading")}</h2>
            <div className="gallery">
              {rich.gallery.map((p, i) => (
                <img key={i} src={photoPublicUrl(p)!} alt="" loading="lazy" className="gallery-img" />
              ))}
            </div>
          </Reveal>
        )}

        <Reveal className="sec sec-rsvp">
          <h2 id="rsvp" className="sec-title">{t("rsvpHeading")}</h2>
          {preview ? <p className="preview-note">{t("previewNote")}</p> : <div className="rsvp-wrap"><RsvpForm slug={event.slug} /></div>}
          {!preview && <a href={forward} target="_blank" rel="noreferrer" className="btn-ghost">{t("forward")}</a>}
        </Reveal>
      </main>

      {rich.music && def.music && (
        <MusicButton src={`/audio/${def.music}.mp3`} playLabel={t("musicPlay")} pauseLabel={t("musicPause")} />
      )}
    </div>
    </>
  );
}
