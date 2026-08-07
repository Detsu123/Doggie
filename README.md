# A Little Date Quest 🐶💗

Golden Retriever-тэй, ягаан retro pixel-game өнгө аястай кофены болзооны санал. `No`
товч бүтэн game screen-ээр зугтаж, оролдлого бүрт үг солигдон нохой аажмаар
гуниглана; `Yes` томорсоор дэлгэцийг дүүргэнэ. Дараа нь custom calendar, цаг,
Canva болон захианы асуултууд гарч, төгсгөлд нохой цэцэг өгөөд сонгосон
мэдээллийг харуулна.

## Шууд ажиллуулах

Node.js 18-аас дээш хувилбар байхад нэмэлт package суулгах шаардлагагүй.

```bash
npm start
```

Дараа нь `http://localhost:3000` хаягийг нээнэ. Шалгалтыг:

```bash
npm test
```

## Өөрийн дууг хийх

Дуугаа дараах нэрээр хуулна:

```text
public/assets/our-song.mp3
```

Зочин `PRESS START` дарахад дуу эхэлнэ. MP3 байхгүй үед жижиг built-in chiptune
ая автоматаар тоглодог тул хуудас дуугүй эвдрэхгүй.

## Болзооны газар, цагийг солих

`public/config.js` доторх `placeName`, `cafeHandle`, `times` утгуудыг өөрчилнө.
Browser болон Telegram тал хоёулаа энэ нэг config-ийг ашигладаг тул цагийн
сонголтууд зөрөхгүй.

## Telegram-аар хариуг авах

Bot token-ийг frontend кодод хийж болохгүй — тэгвэл хэн ч хараад bot-ыг эзэмших
эрсдэлтэй. Энэ төсөл token-ийг зөвхөн server талд `.env`-ээс уншина.

1. Telegram дээр `@BotFather`-аар bot үүсгэнэ.
2. `.env.example` файлыг `.env` болгож хуулна.
3. Bot token-оо `.env` доторх `TELEGRAM_BOT_TOKEN`-д хийнэ. Token-оо GitHub,
   screenshot эсвэл чатад бүү нийтэл.
4. Шинэ bot руугаа Telegram-аас нэг мессеж явуулна.
5. Дараах командыг ажиллуулж өөрийн numeric chat ID-г олно:

   ```bash
   npm run telegram:chat-id
   ```

6. Гарсан ID-г `.env` доторх `TELEGRAM_CHAT_ID`-д хийнэ.
7. Server-ээ дахин асаагаад нэг test response илгээж шалгана.

Хариу ирэхэд Telegram мессеж дотор:

- сонгосон өдөр;
- цаг;
- `@moria_cafemn`;
- Canva болон захианы хариу;
- илгээсэн хугацаа

орж ирнэ.

## Нийтэд өгөх

Frontend болон Telegram endpoint хамт ажилладаг тул зөвхөн static hosting биш,
Node.js server ажиллуулдаг hosting сонгоно. Hosting тохиргоо:

- Start command: `npm start`
- Runtime: Node.js 18+
- Environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- HTTPS: асаалттай

`.env` файлыг upload/commit хийхгүй. Hosting-ийн private environment settings
дотор хоёр утгаа оруулна.

## Гол файлууд

- `public/index.html` — дэлгэцүүдийн бүтэц
- `public/styles.css` — pixel UI, responsive layout, animation
- `public/app.js` — тоглоомын урсгал, calendar, music, submission
- `public/interaction-utils.js` — `Yes` өсөлт, `No` зугталт, нохойн mood шатлал
- `public/config.js` — газар болон цагийн public тохиргоо
- `server.mjs` — static server болон Telegram руу аюулгүй илгээх API
- `tests/interaction-utils.test.mjs` — интеракцын хөдөлгөөн, өсөлтийн tests
- `tests/server.test.mjs` — validation, escaping, API integration tests

Хэрэглэгчээс илүү хувийн мэдээлэл авахгүй; зөвхөн энэ урсгалд сонгосон дөрвөн
хариуг server рүү илгээнэ.
# Doggie
