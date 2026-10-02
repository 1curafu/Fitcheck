import type { Locale } from "@/lib/i18n/locales";
import { NL_NOTES } from "./release-notes-i18n/nl";
import { ES_NOTES } from "./release-notes-i18n/es";
import { PT_NOTES } from "./release-notes-i18n/pt";
import { IT_NOTES } from "./release-notes-i18n/it";
import { FR_NOTES } from "./release-notes-i18n/fr";
import { RU_NOTES } from "./release-notes-i18n/ru";
import { DE_NOTES } from "./release-notes-i18n/de";
/**
 * What each release changed, in the user's language.
 *
 * ⚠️ Hand-written, never derived from commit subjects. Ours name files,
 * functions and weights — "stop sampling an arbitrary frame of a transition" is
 * true and means nothing to someone getting dressed. A test rejects entries that
 * leak that vocabulary.
 *
 * ⚠️ The newest entry's `version` MUST equal package.json's, and a test enforces
 * it. Bumping the app without writing notes would show users the previous
 * release's words, which is worse than showing nothing.
 *
 * Keep lines short. This is a card someone dismisses on the way to their looks,
 * not a changelog page.
 */
export type ReleaseNote = {
  version: string;
  /** ISO date, for ordering. Not shown. */
  date: string;
  /**
   * When the release actually went out (ISO timestamp, e.g. the release PR's merge time). Optional: with only `date`,
   * "released" means midnight UTC of that day — which classifies every account created EARLIER that day as new and
   * permanently suppresses the note for them. Set it on each release; see `accountPredatesRelease`.
   */
  releasedAt?: string;
  /** One line, the reason to care about this release. */
  headline: string;
  added: string[];
  fixed: string[];
  i18n?: Partial<Record<Exclude<Locale, "en-US">, LocalizedNote>>;
};

export type LocalizedNote = { headline: string; added: string[]; fixed: string[] };

const BASE_NOTES: ReleaseNote[] = [
  {
    version: "0.7.0",
    date: "2026-10-02",
    releasedAt: "2026-10-02T05:39:00Z", // when this release was cut; accountPredatesRelease reads it
    headline: "Your color and fit answers now guide your looks.",
    added: ["Your color and fit answers shape every look and trip", "Pro buying advice respects your no-gos and dress codes", "Get help from the new Support page in Settings or on the sign-in screen"],
    fixed: ["Trips choose a well-matched outfit first, then tune it to your taste"],
    i18n: {
      "en-GB": { headline: "Your colour and fit answers now guide your looks.", added: ["Your colour and fit answers shape every look and trip", "Pro buying advice respects your no-gos and dress codes", "Get help from the new Support page in Settings or on the sign-in screen"], fixed: ["Trips choose a well-matched outfit first, then tune it to your taste"] },
      uk: { headline: "Твої відповіді про кольори й посадку тепер формують образи.", added: ["Кольори й посадка враховуються в усіх образах і подорожах", "Поради Pro щодо покупок враховують твої табу й дрес-код", "Нова сторінка Підтримка — у Налаштуваннях і на екрані входу"], fixed: ["Подорожі спершу обирають гармонійний образ, а тоді підлаштовують під твій смак"] },
    },
  },
  {
    version: "0.6.0",
    date: "2026-09-30",
    releasedAt: "2026-09-30T18:07:00Z", // when this release was cut; accountPredatesRelease reads it
    headline: "Your style answers now shape your looks.",
    added: ["Your no-gos are kept out of every look, trip and styled outfit", "Change your style answers any time in Settings, under Style profile", "New pieces are cropped to the garment, so they appear larger in looks"],
    fixed: ["Changing your occasions refreshes today's looks right away"],
    i18n: {
      "en-GB": { headline: "Your style answers now shape your looks.", added: ["Your no-gos are kept out of every look, trip and styled outfit", "Change your style answers any time in Settings, under Style profile", "New pieces are cropped to the garment, so they appear larger in looks"], fixed: ["Changing your occasions refreshes today's looks right away"] },
      uk: { headline: "Твої відповіді про стиль тепер формують образи.", added: ["Твої табу враховуються в усіх образах, подорожах і стилізаціях", "Змінюй відповіді про стиль будь-коли: Налаштування, Профіль стилю", "Нові речі обрізаються по контуру, тож в образах виглядають більшими"], fixed: ["Після зміни приводів образи на сьогодні оновлюються одразу"] },
    },
  },
  {
    version: "0.5.1",
    date: "2026-09-30",
    releasedAt: "2026-09-30T05:31:34Z", // #127 merged
    headline: "Small fixes and improvements.",
    added: [],
    fixed: ["A few small fixes to keep things running smoothly"],
    i18n: {
      "en-GB": { headline: "Small fixes and improvements.", added: [], fixed: ["A few small fixes to keep things running smoothly"] },
      uk: { headline: "Дрібні виправлення та покращення.", added: [], fixed: ["Кілька дрібних виправлень, щоб усе працювало гладко"] },
    },
  },
  {
    version: "0.5.0",
    date: "2026-09-29",
    headline: "Fitcheck now speaks ten languages.",
    added: ["Use Fitcheck in English, Ukrainian, Russian, German, French and more", "Pick your language from a small menu on the welcome page or in Settings", "Your looks, weather and piece details appear in your language", "Past looks show in your language; the original is always kept"],
    fixed: ["The welcome text no longer crowds the sign-in buttons", "Long occasion names stay on one line"],
    i18n: {
      "en-GB": {
        headline: "Fitcheck now speaks ten languages.",
        added: ["Use Fitcheck in English, Ukrainian, Russian, German, French and more", "Pick your language from a small menu on the welcome page or in Settings", "Your looks, weather and piece details appear in your language", "Past looks show in your language; the original is always kept"],
        fixed: ["The welcome text no longer crowds the sign-in buttons", "Long occasion names stay on one line"],
      },
      uk: {
        headline: "Fitcheck тепер розмовляє десятьма мовами.",
        added: ["Користуйся Fitcheck англійською, українською, німецькою, французькою та іншими", "Обирай мову в невеликому меню на вітальній сторінці або в налаштуваннях", "Образи, погода й деталі речей тепер твоєю мовою", "Минулі образи показуються твоєю мовою; оригінал завжди зберігається"],
        fixed: ["Вітальний текст більше не налазить на кнопки входу", "Довгі назви приводів тепер уміщаються в один рядок"],
      },
    },
  },
  {
    version: "0.4.1",
    date: "2026-09-27",
    headline: "Sharing a look is smoother, and removed pieces can go for good.",
    added: ["Create link now copies the link for you", "Delete a removed piece for good from its page"],
    fixed: ["Copy now says Copied right on the button", "Show brands explains when your pieces have no brand yet"],
    i18n: {
      "en-GB": {
        headline: "Sharing a look is smoother, and removed pieces can go for good.",
        added: ["Create link now copies the link for you", "Delete a removed piece for good from its page"],
        fixed: ["Copy now says Copied right on the button", "Show brands explains when your pieces have no brand yet"],
      },
      uk: {
        headline: "Ділитися образами зручніше, а прибрані речі можна видалити назавжди.",
        added: ["Створене посилання тепер одразу копіюється", "Прибрану річ можна видалити назавжди з її сторінки"],
        fixed: ["Кнопка копіювання тепер одразу показує «Скопійовано»", "Показ брендів пояснює, чому для речей без бренду нічого не видно"],
      },
    },
  },
  {
    version: "0.4.0",
    date: "2026-09-27",
    i18n: {
      "uk": {
        "headline": "Ділися образами, додавай кілька речей і повертай прибрані.",
        "added": [
          "Ділися образом як історією, дописом або посиланням",
          "Додавай кілька речей одразу зі своїх фото",
          "Повертай прибрані речі з розділу «Прибрані речі»",
          "Стирай оригінал фото речі — вирізане зображення лишається в образах"
        ],
        "fixed": [
          "Тепер у гардероб можна додавати лише фото"
        ]
      },
      "en-GB": {
        "headline": "Share your looks, add pieces in batches, and bring pieces back.",
        "added": [
          "Share a look as a story, a post or a link",
          "Add several pieces at once from your photos",
          "Put a removed piece back from Removed pieces",
          "Erase a piece's original photo; its cut-out stays in your looks"
        ],
        "fixed": [
          "Only photos can be added to your wardrobe now"
        ]
      }
    },
    headline: "Share your looks, add pieces in batches, and bring pieces back.",
    added: [
      "Share a look as a story, a post or a link",
      "Add several pieces at once from your photos",
      "Put a removed piece back from Removed pieces",
      "Erase a piece's original photo; its cut-out stays in your looks",
    ],
    fixed: ["Only photos can be added to your closet now"],
  },
  {
    version: "0.3.9",
    date: "2026-09-24",
    i18n: {
      "uk": {
        "headline": "Повернення коштів за Pro тепер працює від початку до кінця.",
        "added": [
          "Після повернення коштів підписка Pro завершується без нових списань"
        ],
        "fixed": [
          "Повернення коштів більше не залишає підписку активною"
        ]
      }
    },
    headline: "Refunds for Pro are now handled cleanly from start to finish.",
    added: ["A refunded Pro subscription now ends straight away — no further charges"],
    fixed: ["A refund no longer leaves a subscription running"],
  },
  {
    version: "0.3.8",
    date: "2026-09-24",
    i18n: {
      "uk": {
        "headline": "Fitcheck Pro вже тут — усі можливості щомісяця або щороку.",
        "added": [
          "Обирай Pro на місяць чи рік, керуй ним і скасовуй у налаштуваннях"
        ],
        "fixed": [
          "Налаштування твого облікового запису тепер захищені ще краще"
        ]
      }
    },
    headline: "Fitcheck Pro is here — every feature, monthly or yearly.",
    added: ["Go Pro monthly or yearly, and manage or cancel any time in Settings"],
    fixed: ["Your account settings are now even better protected"],
  },
  {
    version: "0.3.7",
    date: "2026-09-23",
    i18n: {
      "uk": {
        "headline": "Непомітні зміни, щоб твої дані були в безпеці.",
        "added": [
          "Кожне оновлення перевіряє, чи справді застосовано зміни бази даних"
        ],
        "fixed": [
          "Пропущені зміни бази даних більше не залишаться непоміченими"
        ]
      }
    },
    headline: "Quieter work behind the scenes to keep your data safe.",
    added: ["Every update now checks that its database changes really arrived"],
    fixed: ["A database change can no longer go missing without us noticing"],
  },
  {
    version: "0.3.6",
    date: "2026-09-23",
    i18n: {
      "uk": {
        "headline": "Прибирання речі тепер пояснює, що саме відбудеться.",
        "added": [
          "Прибирання речі просить підтвердження й пояснює, що залишиться"
        ],
        "fixed": [
          "Повідомлення про cookie більше не закриває кнопку «Назад» у речах та образах"
        ]
      }
    },
    headline: "Removing a piece now tells you exactly what happens.",
    added: ["Removing a piece asks first, and explains what's kept and what's not"],
    fixed: ["The cookie notice no longer covers the back button on a piece or a look"],
  },
  {
    version: "0.3.5",
    date: "2026-09-23",
    i18n: {
      "uk": {
        "headline": "Видалення облікового запису тепер надійніше.",
        "added": [
          "Якщо видалення облікового запису не вдасться, ми одразу про це дізнаємося"
        ],
        "fixed": [
          "Збій видалення тепер показує нам, який саме крок треба виправити"
        ]
      }
    },
    headline: "Account deletion is more dependable behind the scenes.",
    added: ["If deleting your account ever fails, we now find out straight away"],
    fixed: ["A failed account deletion now tells us exactly which step to fix"],
  },
  {
    version: "0.3.4",
    date: "2026-09-23",
    i18n: {
      "uk": {
        "headline": "Резервні копії тепер відновлюють усе — разом із фото.",
        "added": [
          "Відновлення з резервної копії тепер перевіряється від початку до кінця"
        ],
        "fixed": [
          "Відновлена резервна копія тепер повертає доступ до твоїх фото",
          "Нові користувачі можуть зареєструватися одразу після відновлення"
        ]
      }
    },
    headline: "Your backups now bring everything back — photos included.",
    added: ["Recovery from a backup is now tested from start to finish"],
    fixed: [
      "A recovered backup now restores access to your photos",
      "New sign-ups work straight after a recovery",
    ],
  },
  {
    version: "0.3.3",
    date: "2026-09-22",
    i18n: {
      "uk": {
        "headline": "Видалення облікового запису більше нічого не залишає.",
        "added": [
          "Видалення облікового запису тепер перевіряє, чи не залишилося жодного фото"
        ],
        "fixed": [
          "Фото, що завантажується на іншому пристрої під час видалення, теж стирається",
          "Відновлена копія більше не зберігає фото видаленого облікового запису"
        ]
      }
    },
    headline: "Deleting your account now leaves nothing behind.",
    added: ["Account deletion now double-checks that no photo is left behind"],
    fixed: [
      "A photo uploading on another device while you delete is removed too",
      "A restored backup can no longer keep photos from a deleted account",
    ],
  },
  {
    version: "0.3.2",
    date: "2026-09-20",
    i18n: {
      "uk": {
        "headline": "Твій обліковий запис — твоє рішення. Видалення вже в налаштуваннях.",
        "added": [
          "Видаляй обліковий запис і його дані просто в налаштуваннях",
          "Fitcheck зберігає зашифровані резервні копії на випадок збою"
        ],
        "fixed": [
          "Відновлена копія більше не повертає видалений обліковий запис"
        ]
      }
    },
    headline: "Your account, your call — deletion is now in Settings.",
    added: [
      "Delete your account and live data directly from Settings",
      "Fitcheck now keeps encrypted recovery backups if something goes wrong",
    ],
    fixed: ["A recovered backup can no longer bring back a deleted account"],
  },
  {
    version: "0.3.1",
    date: "2026-09-17",
    i18n: {
      "uk": {
        "headline": "Чистіші вирізані фото, а кнопка повороту — на видноті.",
        "added": [
          "Кнопка повороту тепер на фото, тож ти бачиш, як воно повертається"
        ],
        "fixed": [
          "Проміжки між рукавом і корпусом більше не стають білими плямами",
          "Кнопка повторного фото більше не виглядає як кнопка повороту",
          "Ця картка з’являється після оновлення й у застосунку на головному екрані"
        ]
      }
    },
    headline: "Cleaner cutouts, and Rotate where you can see it.",
    added: ["The Rotate button now sits on the photo, so you watch it turn"],
    fixed: [
      "Gaps between a sleeve and the body no longer come out as white patches",
      "Retake no longer looks like a rotate button",
      "This card shows up after an update on the home-screen app too",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-17",
    i18n: {
      "uk": {
        "headline": "Додавати одяг швидше, а фото одразу повертаються правильно.",
        "added": [
          "Видалення фону займає менше секунди й завантажує у 5 разів менше даних",
          "Фото боком? Повернемо його правильно — і є кнопка повороту",
          "Політика конфіденційності й умови простою мовою там, де вони потрібні"
        ],
        "fixed": [
          "Білі речі на світлому фоні більше не втрачають своїх країв",
          "Низи штанів і манжети сорочок зберігають форму на вирізаному фото"
        ]
      }
    },
    headline: "Adding clothes is faster, and they come out the right way up.",
    added: [
      "Background removal now runs in under a second — and downloads 5× less",
      "Photographed sideways? It's turned upright for you — and there's a Rotate button",
      "Privacy policy and terms, written in plain language, linked where they matter",
    ],
    fixed: [
      "White garments on pale backgrounds no longer lose their edges",
      "Trouser hems and shirt cuffs keep their shape in the cutout",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-09",
    i18n: {
      "uk": {
        "headline": "Твої образи стали розумнішими.",
        "added": [
          "Сукні й комбінезони тепер утворюють повний образ самі",
          "Сумки, годинники й другий аксесуар можуть доповнювати образ",
          "Образи враховують поєднання тканин: льон із вовною, шовк зі шкірою",
          "Взуття оцінюється разом з одягом, а не саме по собі"
        ],
        "fixed": [
          "Сукня більше не отримує кросівки, коли потрібне щось ошатніше",
          "Кросівки зі строгим одягом — лише там, де це справді працює",
          "Сумка чи годинник, що підхоплюють колір, нарешті враховуються",
          "Дві важкі в’язані речі разом більше не вважаються вдалим поєднанням"
        ]
      },
      "en-GB": {
        "headline": "Your looks just got smarter.",
        "added": [
          "Dresses and jumpsuits — a one-piece is a full look now",
          "Bags, watches and a second accessory can join a look",
          "Outfits weigh fabric against fabric: linen with wool, silk with leather",
          "Shoes are judged against what you wear them with, not on their own"
        ],
        "fixed": [
          "A dress no longer gets trainers when it asked for something smarter",
          "Trainers with tailoring only where that actually works",
          "A bag or watch that picks up a colour is finally noticed",
          "Two heavy knits together no longer read as one good idea"
        ]
      }
    },
    headline: "Your looks just got smarter.",
    added: [
      "Dresses and jumpsuits — a one-piece is a full look now",
      "Bags, watches and a second accessory can join a look",
      "Outfits weigh fabric against fabric: linen with wool, silk with leather",
      "Shoes are judged against what you wear them with, not on their own",
    ],
    fixed: [
      "A dress no longer gets trainers when it asked for something smarter",
      "Sneakers with tailoring only where that actually works",
      "A bag or watch that picks up a colour is finally noticed",
      "Two heavy knits together no longer read as one good idea",
    ],
  },
];

type MoreLocale = Exclude<Locale, "en-US" | "en-GB" | "uk">;
/** Plan 3 languages keep their history in lib/release-notes-i18n/<locale>.ts, keyed by version. */
const MORE_NOTES: Partial<Record<MoreLocale, Record<string, LocalizedNote>>> = {de: DE_NOTES, ru: RU_NOTES, fr: FR_NOTES, it: IT_NOTES, pt: PT_NOTES, es: ES_NOTES, nl: NL_NOTES };
export const MORE_NOTES_FOR_TEST = MORE_NOTES;

export const RELEASE_NOTES: ReleaseNote[] = BASE_NOTES.map(note => ({
  ...note,
  i18n: {
    ...note.i18n,
    ...Object.fromEntries(Object.entries(MORE_NOTES).flatMap(([locale, map]) => map?.[note.version] ? [[locale, map[note.version]]] : [])),
  },
}));

/** The release the app is running. */
export const CURRENT_RELEASE = RELEASE_NOTES[0];

export function noteFor(note: ReleaseNote, locale: Locale): ReleaseNote {
  const translated = locale === "en-US" ? undefined : note.i18n?.[locale];
  return translated ? { ...note, ...translated } : note;
}

/**
 * Was this account created before the release went out? Decides "returning" for the What's new card: storage cannot tell
 * a returning user from a new one (a home-screen app and Safari keep separate storage), the creation time can.
 *
 * Uses `releasedAt` when the note has one, else midnight UTC of its `date`. An unparseable creation time is NOT
 * returning — never show a release note to someone we cannot place.
 */
export function accountPredatesRelease(createdAt: string | undefined | null, release: Pick<ReleaseNote, "date" | "releasedAt">): boolean {
  const created = createdAt ? new Date(createdAt).getTime() : NaN;
  const released = new Date(release.releasedAt ?? release.date).getTime();
  return Number.isFinite(created) && Number.isFinite(released) && created < released;
}
