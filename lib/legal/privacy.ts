import type { Locale, ShippedLocale } from "@/lib/i18n/locales";
import { PRIVACY_DE } from "./translations/de";
import { OPERATOR, PRIVACY_UPDATED, type LegalDocument } from "./types";

/**
 * ⚠️ Every third party named here is one the code sends data to, and the test
 * checks the reverse: a new SDK in package.json that handles user data must be
 * named here before it ships. Written in plain language on purpose — a policy
 * nobody can read protects nobody.
 *
 * ⚠️ A DRAFT for a lawyer to read before subscriptions go live. It describes
 * what the app does accurately; whether it satisfies every clause of the FADP
 * and GDPR is a legal opinion this file cannot give.
 */
const PRIVACY_EN: LegalDocument = {
  title: "Privacy Policy",
  updated: PRIVACY_UPDATED,
  intro:
    "Fitcheck photographs your wardrobe and suggests outfits from it. That means it holds photos of your clothes and a little about you. This page says exactly what, why, who else touches it, and how to make us delete it.",
  sections: [
    {
      id: "who-is-responsible",
      heading: "Who is responsible",
      paragraphs: [
        `${OPERATOR.name}, operating from ${OPERATOR.country}, is the controller of your data. For anything on this page, write to ${OPERATOR.email}.`,
        "Swiss data protection law (the FADP) applies. If you are in the EU or EEA, the GDPR applies to you as well, and every right listed below is yours under both.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "What we collect",
      paragraphs: ["Only what the app needs to do its job. Nothing is collected for advertising, and nothing is sold."],
      bullets: [
        "Your account: your email address, and if you sign in with Google, the name and profile picture Google shares.",
        "Your style answers from the short quiz: how you like to dress, what you would rather not wear.",
        "Your wardrobe: the photos you upload, the cut-out versions we make of them, and the tags describing each piece — colour, fabric, formality and so on. You can edit every tag.",
        "If a photo you upload shows you wearing the item, we store that photo as you took it. We keep the original only so the cut-out can be re-made with better tools later; it is never sent to the AI, never used to identify you, and never shown to anyone but you. You can erase the original photo of any piece that has a cut-out, from its page. The cut-out stays in your looks, and an erased original can't be used to re-make a better cut-out. For other pieces, write to legal@fitcheck.space and we will delete it. You can also delete a removed piece for good from its page in Removed pieces: its photos and details are deleted, and past looks keep their other pieces.",
        "Your looks: the outfits the app suggests, the ones you favourite, and the days you say you wore one.",
        "Your location, only if you give it: a city or coordinates and a time zone, so the weather in your looks is your weather. You can clear it in Settings.",
        "If you subscribe to Pro: your Stripe customer ID, your subscription's status and renewal date, and when you confirmed that Pro should start immediately. Card details go to Stripe and Link and never reach us.",
        "Technical details when something breaks: the error, the page, and the browser. Not your name, and not what you typed.",
      ],
    },
    {
      id: "sharing-a-look",
      heading: "Sharing a look",
      paragraphs: [
        "Sharing is always your choice. Share image makes a picture on your phone; we store nothing about it. Create link publishes a snapshot of one look: its pictures, its name, the stylist's sentence and the names of its pieces (and their brands, only if you choose). Anyone with the link can see it for 30 days, or until you stop sharing, from the look or from Settings. There is no name, no account and nothing else of yours on it, and it is not indexed by search engines. Deleting your account removes your shared looks at once. A picture you post to Instagram, TikTok or anywhere else is a copy we cannot delete. After a disaster restore of our systems, shared links are switched off and must be shared again.",
      ],
    },
    {
      id: "why-we-use-it",
      heading: "Why we use it",
      paragraphs: [
        "To run the service you signed up for — tagging your clothes, building looks, remembering what you wore. Under the GDPR this is performance of a contract.",
        "To keep the app working and find bugs. Under the GDPR this is our legitimate interest, and it is limited to error reports.",
        "To sell you Pro and keep it switched on while you pay for it. Contract again, plus the bookkeeping the law requires.",
        "Nothing else. No profiling beyond styling your own wardrobe, no advertising, no sharing with data brokers.",
      ],
    },
    {
      id: "who-else-sees-it",
      heading: "Who else sees it",
      paragraphs: [
        "We use a small number of companies to run Fitcheck. Each receives only what its job needs, and is bound by a data-processing agreement.",
      ],
      bullets: [
        "Supabase (EU, Frankfurt) — stores your account, photos and everything above. Your data lives in the EU.",
        "Anthropic (USA) — the AI that tags your clothes. It receives the cut-out photo of a garment to describe it, and short text descriptions of pieces — never photos — to reason about outfits. Anthropic does not train its models on data sent through its API.",
        "OpenWeather — receives your coordinates to return a forecast. Nothing else.",
        "Google — only if you choose to sign in with Google.",
        "Resend (USA) — sends the sign-in email.",
        "Stripe — handles payment for Pro; with Link, the only parties that see card details.",
        "Link (Stripe) — sells Fitcheck Pro to you as merchant of record: it takes your payment, charges VAT and sends receipts, under its own terms and privacy policy. Deleting your Fitcheck account cancels your subscription; Link and Stripe keep the payment records the law requires.",
        "Sentry (EU) — receives error reports, so we can fix what broke.",
        "Vercel — hosts the app, and counts page views without cookies or any identifier stored on your device. Like any host it also sees the requests your browser makes.",
      ],
    },
    {
      id: "data-leaving-europe",
      heading: "Data leaving Europe",
      paragraphs: [
        "Anthropic, Resend, Google and Stripe are based in, or process data through, the United States. Transfers to them rest on the EU–US Data Privacy Framework where the provider is certified, and on the European Commission's Standard Contractual Clauses otherwise, which Switzerland recognises with its own addendum. Where they offer it, Google and Stripe handle Swiss and EU users through their European entities.",
      ],
    },
    {
      id: "how-long-we-keep-it",
      heading: "How long we keep it",
      paragraphs: [
        "For as long as you have an account. Delete your account in Settings; a successful deletion removes your live data immediately. To erase a single piece's original photo instead, or to delete a removed piece for good, use the options on that piece's page. You can also write to legal@fitcheck.space if you need help with deletion.",
        "Encrypted backups may retain deleted data for no more than 30 days before they expire. Error reports are kept for 90 days. Legally required payment records are kept by Link and Stripe for as long as tax law requires; our copy of your billing status goes when your account does.",
      ],
    },
    {
      id: "your-rights",
      heading: "Your rights",
      paragraphs: [
        `Delete your account in Settings, or write to ${OPERATOR.email} if you need help. We respond to other rights requests within 30 days. You can:`,
      ],
      bullets: [
        "See everything we hold about you, and get a copy in a machine-readable form.",
        "Correct anything wrong — most of it you can correct yourself, in the app.",
        "Have your account and everything in it deleted.",
        "Object to, or ask us to restrict, any processing based on legitimate interest.",
        "Complain to a supervisory authority: the Federal Data Protection and Information Commissioner in Switzerland, or the authority in your EU country.",
      ],
    },
    {
      id: "cookies-and-storage-on-your-device",
      heading: "Cookies and storage on your device",
      paragraphs: [
        "Fitcheck sets only the cookies it needs to keep you signed in and remember your language. There are no advertising or tracking cookies, which is why you are shown a notice rather than asked for consent.",
        "The app also keeps a few small preferences in your browser's own storage — for example, which release notes you have already dismissed. These never leave your device.",
      ],
    },
    {
      id: "age",
      heading: "Age",
      paragraphs: ["Fitcheck is for people aged 16 and over. If you are younger, please do not create an account."],
    },
    {
      id: "changes",
      heading: "Changes",
      paragraphs: [
        "When this page changes in any way that matters, the date at the top moves and the app tells you on your next visit. The current version is always at fitcheck.space/privacy.",
      ],
    },
  ],
};

const PRIVACY_UK: LegalDocument = {
  title: "Політика конфіденційності",
  updated: PRIVACY_UPDATED,
  intro: "Якщо цей переклад відрізняється від англійської версії, діє англійська версія. Fitcheck фотографує твій гардероб і пропонує образи з нього. Тому він зберігає фото твого одягу й трохи інформації про тебе. Тут точно описано, що саме, навіщо, хто ще працює з цими даними та як попросити нас їх видалити.",
  sections: [
    {
      id: "who-is-responsible",
      heading: "Хто відповідає за дані",
      paragraphs: [
        `${OPERATOR.name}, який працює зі Швейцарії (${OPERATOR.country}), є контролером твоїх даних. Із будь-якого питання на цій сторінці пиши на ${OPERATOR.email}.`,
        "Застосовується швейцарський закон про захист даних (FADP). Якщо ти в ЄС або ЄЕЗ, до тебе також застосовується GDPR; усі наведені нижче права належать тобі за обома законами.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "Що ми збираємо",
      paragraphs: ["Лише те, що потрібно застосунку для роботи. Нічого не збираємо для реклами й нічого не продаємо."],
      bullets: [
        "Твій акаунт: електронна адреса, а при вході через Google — ім'я та фото профілю, які передає Google.",
        "Твої відповіді в короткому опитуванні про стиль: як ти любиш вдягатися й чого волієш не носити.",
        "Твій гардероб: завантажені фото, створені нами вирізані зображення та теги кожної речі — колір, тканина, формальність тощо. Кожен тег можна змінити.",
        "Якщо на завантаженому фото річ одягнута на тобі, ми зберігаємо фото саме таким. Оригінал потрібен лише для можливості згодом зробити краще вирізання новими інструментами; його ніколи не надсилаємо ШІ, не використовуємо для встановлення твоєї особи й не показуємо нікому, крім тебе. На сторінці будь-якої речі з вирізаним зображенням можна стерти оригінальне фото. Вирізане зображення залишається в образах, а стертий оригінал уже не можна використати для кращого вирізання. Для інших речей напиши на legal@fitcheck.space, і ми його видалимо. Прибрану річ також можна видалити назавжди з її сторінки в розділі «Прибрані речі»: фото й опис буде видалено, а минулі образи збережуть інші речі.",
        "Твої образи: запропоновані застосунком, додані до улюблених і дати, коли, за твоїм записом, ти їх одягав.",
        "Твоє місце, лише якщо ти його надаєш: місто або координати та часовий пояс, щоб погода в образах відповідала твоїй. Прибрати місце можна в налаштуваннях.",
        "При підписці на Pro: ідентифікатор клієнта Stripe, стан і дата поновлення підписки та момент твого підтвердження негайного початку Pro. Дані картки отримують Stripe і Link; ми їх не отримуємо.",
        "Технічні дані при збоях: помилка, сторінка й браузер. Без твого імені й введеного тексту.",
      ],
    },
    {
      id: "sharing-a-look",
      heading: "Поширення образу",
      paragraphs: ["Ділитися чи ні — завжди твій вибір. «Поділитися зображенням» створює картинку на телефоні; ми нічого про неї не зберігаємо. «Створити посилання» публікує знімок одного образу: його зображення, назву, пояснення стиліста й назви речей (а бренди — лише за твоїм вибором). Кожен із посиланням може бачити його 30 днів або до припинення поширення зі сторінки образу чи налаштувань. На ньому немає твого імені, акаунта чи інших твоїх даних; пошукові системи його не індексують. Видалення акаунта одразу прибирає поширені образи. Зображення, опубліковане тобою в Instagram, TikTok чи деінде, — це копія, яку ми не можемо видалити. Після аварійного відновлення наших систем поширені посилання вимикаються; їх потрібно створити знову."],
    },
    {
      id: "why-we-use-it",
      heading: "Навіщо використовуємо дані",
      paragraphs: [
        "Щоб надавати послугу, на яку ти зареєструвався: визначати теги речей, складати образи, пам'ятати носіння. За GDPR це виконання договору.",
        "Щоб підтримувати роботу застосунку й знаходити помилки. За GDPR це наш законний інтерес, обмежений звітами про помилки.",
        "Щоб продавати Pro й підтримувати його дію, поки ти платиш. Знову виконання договору, а також облік, передбачений законом.",
        "Більше ні для чого. Немає профілювання поза стилізацією твого гардероба, реклами чи передачі брокерам даних.",
      ],
    },
    {
      id: "who-else-sees-it",
      heading: "Хто ще бачить дані",
      paragraphs: ["Для роботи Fitcheck ми залучаємо невелику кількість компаній. Кожна отримує лише необхідне для своєї задачі й пов'язана угодою про обробку даних."],
      bullets: [
        "Supabase (ЄС, Франкфурт) — зберігає твій акаунт, фото й усі перелічені вище дані. Твої дані зберігаються в ЄС.",
        "Anthropic (США) — ШІ, що визначає теги одягу. Отримує вирізане фото речі для її опису та короткі текстові описи речей — ніколи не фото — для міркувань про образи. Anthropic не навчає свої моделі на даних, надісланих через його API.",
        "OpenWeather — отримує координати, щоб повернути прогноз. Більше нічого.",
        "Google — лише якщо ти обираєш вхід через Google.",
        "Resend (США) — надсилає лист для входу.",
        "Stripe — обробляє оплату Pro; разом із Link це єдині сторони, які бачать дані картки.",
        "Link (Stripe) — продає тобі Fitcheck Pro як офіційний продавець (merchant of record): приймає оплату, нараховує ПДВ і надсилає квитанції за власними умовами й політикою конфіденційності. Видалення акаунта Fitcheck скасовує підписку; Link і Stripe зберігають платіжні записи, яких вимагає закон.",
        "Sentry (ЄС) — отримує звіти про помилки, щоб ми могли їх виправляти.",
        "Vercel — розміщує застосунок і рахує перегляди сторінок без cookie чи будь-якого ідентифікатора на твоєму пристрої. Як і будь-який хостинг, бачить запити браузера.",
      ],
    },
    {
      id: "data-leaving-europe",
      heading: "Передача даних за межі Європи",
      paragraphs: ["Anthropic, Resend, Google і Stripe розташовані у США або обробляють там дані. Передача їм ґрунтується на EU–US Data Privacy Framework, якщо постачальник сертифікований, а в інших випадках — на стандартних договірних положеннях Європейської комісії, які Швейцарія визнає зі своїм доповненням. Де це доступно, Google і Stripe обслуговують користувачів зі Швейцарії та ЄС через свої європейські юридичні особи."],
    },
    {
      id: "how-long-we-keep-it",
      heading: "Як довго зберігаємо дані",
      paragraphs: [
        "Поки в тебе є акаунт. Видали його в налаштуваннях: успішне видалення одразу прибирає поточні дані. Щоб натомість стерти оригінальне фото окремої речі чи видалити прибрану річ назавжди, скористайся діями на її сторінці. За допомогою з видаленням можна також написати на legal@fitcheck.space.",
        "Зашифровані резервні копії можуть містити видалені дані не довше 30 днів до завершення строку зберігання. Звіти про помилки зберігаються 90 днів. Link і Stripe зберігають обов'язкові платіжні записи стільки, скільки вимагає податкове право; наша копія стану оплати зникає разом із акаунтом.",
      ],
    },
    {
      id: "your-rights",
      heading: "Твої права",
      paragraphs: [`Видали акаунт у налаштуваннях або напиши на ${OPERATOR.email}, якщо потрібна допомога. На інші запити щодо прав відповідаємо протягом 30 днів. Ти можеш:`],
      bullets: [
        "Побачити всі дані, які ми маємо про тебе, й отримати копію в машинозчитуваному форматі.",
        "Виправити неточності — більшість можна виправити самостійно в застосунку.",
        "Попросити видалити акаунт і все в ньому.",
        "Заперечити проти обробки на підставі законного інтересу або попросити її обмежити.",
        "Подати скаргу наглядовому органу: Федеральному уповноваженому із захисту даних та інформації у Швейцарії або відповідному органу своєї країни ЄС.",
      ],
    },
    {
      id: "cookies-and-storage-on-your-device",
      heading: "Cookie та сховище на твоєму пристрої",
      paragraphs: [
        "Fitcheck встановлює лише cookie для збереження входу й мови. Рекламних cookie чи cookie для стеження немає, тому ми показуємо повідомлення, а не просимо згоду.",
        "Застосунок також зберігає кілька невеликих налаштувань у сховищі браузера — наприклад, які новини оновлення ти вже закрив. Вони ніколи не залишають твій пристрій.",
      ],
    },
    {
      id: "age",
      heading: "Вік",
      paragraphs: ["Fitcheck призначений для людей від 16 років. Якщо ти молодший, будь ласка, не створюй акаунт."],
    },
    {
      id: "changes",
      heading: "Зміни",
      paragraphs: ["Коли зміст цієї сторінки суттєво змінюється, ми оновлюємо дату вгорі й повідомляємо про це під час наступного візиту. Поточна версія завжди доступна на fitcheck.space/privacy."],
    },
  ],
};
export const PRIVACY: Record<ShippedLocale, LegalDocument> & Partial<Record<Locale, LegalDocument>> = { "en-US": PRIVACY_EN, "en-GB": PRIVACY_EN, uk: PRIVACY_UK, de: PRIVACY_DE };
