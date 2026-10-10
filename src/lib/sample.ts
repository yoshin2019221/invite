import type { PublicEvent } from "@/lib/events";
import type { Rich } from "@/lib/rich";
import { templateOf } from "@/lib/templates";
import { THEMES } from "@/lib/themes";

// Sample details so a template can be previewed without a database (preview route + template gallery).
void THEMES;
const OCC: Record<string, string> = {
  royal: "wedding", bloom: "wedding", griha: "housewarming", pooja: "pooja", confetti: "birthday", blossom: "baby", night: "party",
};
const EN: Record<string, [string, string]> = {
  royal: ["Aarav & Meera", "The Sharma and Kapoor families"],
  bloom: ["Aarav & Meera", "The Sharma and Kapoor families"],
  griha: ["Griha Pravesh", "The Verma family"],
  pooja: ["Satyanarayan Pooja", "The Gupta family"],
  confetti: ["Riya turns 7", "Riya's mummy and papa"],
  blossom: ["Welcome, little one", "Neha and Kabir"],
  night: ["Karan's 30th", "Karan and friends"],
};
const HI: Record<string, [string, string]> = {
  royal: ["आरव और मीरा", "शर्मा और कपूर परिवार"],
  bloom: ["आरव और मीरा", "शर्मा और कपूर परिवार"],
  griha: ["गृह प्रवेश", "वर्मा परिवार"],
  pooja: ["सत्यनारायण पूजा", "गुप्ता परिवार"],
  confetti: ["रिया हुई 7 साल की", "रिया के मम्मी-पापा"],
  blossom: ["स्वागत है, नन्हे मेहमान", "नेहा और कबीर"],
  night: ["करण का 30वाँ जन्मदिन", "करण और दोस्त"],
};

export function sampleEvent(template: string, locale: string): { event: PublicEvent; rich: Rich } {
  const def = templateOf(template);
  const [title, hosts] = (locale === "hi" ? HI : EN)[def.id] ?? (locale === "hi" ? HI : EN).royal;
  const start = new Date(Date.now() + 40 * 86_400_000);
  start.setUTCHours(13, 0, 0, 0); // 6:30 pm IST
  const iso = (d: number, h: number) => { const x = new Date(start.getTime() + d * 86_400_000); x.setUTCHours(h, 0, 0, 0); return x.toISOString(); };
  const hi = locale === "hi";
  const rich: Rich = {
    countdown: true, music: true, gallery: [],
    story: [
      { title: hi ? "पहली मुलाक़ात" : "We met", when: "2019", text: hi ? "एक दोस्त की शादी में चाय पर हुई बातचीत से शुरू हुई कहानी।" : "A chai at a friend's wedding turned into a very long conversation." },
      { title: hi ? "हाँ कह दिया" : "She said yes", when: "2025", text: hi ? "परिवार की मौजूदगी में, बालकनी में, सूरज ढलते हुए।" : "On the balcony at sunset, with both families peeking from the kitchen." },
    ],
    itinerary: [
      { name: hi ? "मेहंदी" : "Mehendi", startsAt: iso(-1, 10), venue: hi ? "घर पर" : "At home", note: hi ? "हरे और पीले रंग पहनें" : "Wear green and yellow" },
      { name: hi ? "संगीत" : "Sangeet", startsAt: iso(0, 14), venue: "The Grand, Jaipur" },
      { name: hi ? "मुख्य समारोह" : "Main ceremony", startsAt: iso(1, 13), venue: "The Grand, Jaipur" },
    ],
  };
  const event: PublicEvent = {
    slug: "sample", title, host_names: hosts, occasion: OCC[def.id] ?? "party", starts_at: start.toISOString(), timezone: "Asia/Kolkata",
    venue_name: "The Grand, Jaipur", address: "12 Civil Lines, Jaipur, Rajasthan", map_url: null,
    message: hi ? "आपके आशीर्वाद और उपस्थिति के बिना हमारी ख़ुशी अधूरी है। हमारे साथ इस दिन को यादगार बनाइए।" : "Your blessings and your presence will make this day complete. Come celebrate with us.",
    photo_path: null, theme: "haldi", template: def.id, details: { rich }, updated_at: new Date().toISOString(),
  };
  return { event, rich };
}
