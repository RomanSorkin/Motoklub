# 🏍️ MotoKlub — web pro motorkářskou skupinu

Hotová kostra webu (varianta B z návrhu): **Next.js + PostgreSQL**, nasaditelná z GitHubu na **Railway**.

**Co umí:**

- Registrace a přihlášení členů (heslo se ukládá jen jako hash)
- Schvalování nových účtů adminem (uzavřená komunita) + nepovinný zvací kód
- Přidání trasy: název, popis, délka, náročnost, **GPX** (nahrání souboru i odkaz), fotky
- Zobrazení GPX trasy na **interaktivní mapě** (Leaflet + OpenStreetMap) a stažení GPX
- **Komentáře** a **hvězdičkové hodnocení** (1–5, průměr u trasy)
- Jednoduchá **admin** stránka pro správu členů

> První zaregistrovaný uživatel se automaticky stane **adminem** a je rovnou schválený. Další účty pak schvaluješ ty v sekci „Správa".

---

## 🧱 Použité technologie

| Vrstva | Technologie |
|---|---|
| Frontend + backend | Next.js 14 (App Router, server actions) |
| Databáze | PostgreSQL + Prisma ORM |
| Přihlášení | vlastní, JWT v httpOnly cookie (`jose` + `bcryptjs`) |
| Mapa / GPX | Leaflet + `leaflet-gpx`, dlaždice z OpenStreetMap |
| Úložiště souborů | souborový systém (Railway volume); připraveno i pro Cloudflare R2 |

---

## 📁 Struktura projektu

```
moto-klub/
├─ prisma/schema.prisma      # datový model (User, Route, RouteImage, Comment, Rating)
├─ scripts/create-admin.ts   # ruční vytvoření admina
├─ src/
│  ├─ lib/                   # db, auth (JWT), storage (ukládání souborů)
│  ├─ app/
│  │  ├─ actions/            # server actions (registrace, trasy, admin)
│  │  ├─ page.tsx            # seznam tras
│  │  ├─ routes/[id]         # detail trasy (mapa, komentáře, hodnocení)
│  │  ├─ routes/new          # formulář nové trasy
│  │  ├─ login, register     # přihlášení a registrace
│  │  ├─ admin               # správa členů
│  │  └─ api/files/[...key]  # servírování nahraných souborů
│  └─ components/RouteMap.tsx# mapa s GPX
└─ .env.example             # vzor konfigurace
```

---

## 💻 1) Lokální spuštění (nepovinné, pro vyzkoušení na svém počítači)

Potřebuješ Node.js 18+ a běžící PostgreSQL (nebo použij rovnou Railway a tento krok přeskoč).

```bash
npm install
cp .env.example .env          # a vyplň hodnoty (viz níže)
npx prisma db push            # vytvoří tabulky v databázi
npm run dev                   # běží na http://localhost:3000
```

Hodnoty v `.env`:

- `DATABASE_URL` — připojení k Postgresu
- `AUTH_SECRET` — náhodný řetězec, vygeneruj: `openssl rand -base64 32`
- `UPLOAD_DIR` — kam ukládat soubory, lokálně nech `./uploads`
- `INVITE_CODE` — nepovinný zvací kód (nech prázdné = registrace bez kódu)

---

## 🐙 2) Push na GitHub — krok za krokem

1. Na GitHubu vytvoř nový **prázdný** repozitář (bez README), např. `moto-klub`.
2. V adresáři projektu spusť:

   ```bash
   git init
   git add .
   git commit -m "MotoKlub – první verze"
   git branch -M main
   git remote add origin https://github.com/<tvuj-ucet>/moto-klub.git
   git push -u origin main
   ```

3. Ověř, že se soubory objevily na GitHubu. Díky `.gitignore` se **nenahraje** `node_modules`, `.env` ani nahrané soubory — to je správně.

> ⚠️ `.env` se schválně nenahrává (jsou v něm tajné hodnoty). Na Railway je nastavíš zvlášť (krok 3).

---

## 🚂 3) Nasazení na Railway — krok za krokem

1. **Nový projekt:** na [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → vyber `moto-klub`. Railway rozpozná Next.js a začne stavět (první build ještě spadne — nemá databázi, to je v pořádku, doplníme ji).

2. **Přidej databázi:** v projektu **New** → **Database** → **Add PostgreSQL**.

3. **Nastav proměnné (Variables) u služby s aplikací** (ne u databáze):

   | Proměnná | Hodnota |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — napiš přesně takto, Railway doplní odkaz na tvoji databázi |
   | `AUTH_SECRET` | náhodný řetězec (`openssl rand -base64 32`) |
   | `UPLOAD_DIR` | `/data/uploads` |
   | `INVITE_CODE` | (nepovinné) zvací kód |

4. **Přidej disk pro soubory (Volume):** u služby s aplikací → **Settings** → **Volumes** → **New Volume**, mount path nastav na **`/data`**. Sem se budou ukládat GPX i fotky (proto `UPLOAD_DIR=/data/uploads`).

5. **Nasazení:** Railway po uložení proměnných spustí nový build.
   - `build` = `prisma generate && next build`
   - `start` = `prisma db push` (vytvoří tabulky) `&& next start`
   Není potřeba nic ručně migrovat — tabulky vzniknou při prvním startu.

6. **Zapni doménu:** u aplikace → **Settings** → **Networking** → **Generate Domain**. Dostaneš adresu typu `moto-klub-production.up.railway.app`.

7. **Vytvoř si admina:** otevři web → **Registrace**. První účet je automaticky admin a rovnou schválený. Hotovo 🎉

> Alternativně jde admin vytvořit i příkazem (v Railway → služba → **Deploy** → shell, nebo lokálně proti produkční DB):
> `npm run create:admin -- ja@email.cz mojeheslo Jméno`

---

## 🌐 4) Vlastní doména (nepovinné)

V **Settings → Networking → Custom Domain** přidej svou doménu (např. `trasy.mojeklub.cz`) a u registrátora nastav `CNAME` podle instrukcí Railway. HTTPS zařídí Railway automaticky.

---

## ☁️ 5) Pozdější upgrade: Cloudflare R2 místo volume

Volume plně stačí pro start. Až budeš chtít oddělit soubory od aplikace (lepší škálování, zálohy, 10 GB zdarma), přejdi na **Cloudflare R2** (S3-kompatibilní):

1. Založ R2 bucket a API token na Cloudflare.
2. Přidej balíček `@aws-sdk/client-s3`.
3. Uprav `src/lib/storage.ts` — místo zápisu na disk nahrávej do R2 (`PutObjectCommand`) a v `readFile`/servírování buď streamuj z R2, nebo vracej veřejnou URL bucketu.
Zbytek aplikace se měnit nemusí — pracuje jen s „klíčem" souboru.

---

## 🔧 Údržba a tipy

- **Zálohy:** v Railebay u PostgreSQL zapni zálohy (Settings). Za soubory na volume dělej občas kopii.
- **Aktualizace balíčků:** ~1× měsíčně `npm outdated` a `npm update`; na GitHubu si můžeš zapnout Dependabot.
- **Spam v registraci:** vyplň `INVITE_CODE` a sděl ho jen členům, nebo prostě schvaluj účty ručně v sekci Správa.
- **Limit fotek:** formulář přijímá max 8 obrázků na trasu (á 8 MB) a GPX do 10 MB — uprav v `src/app/actions/routes.ts`, pokud potřebuješ jinak.

---

## ⚠️ Poznámka k ověření

Kód byl napsán a pročten, ale **build nebyl spuštěn v prostředí, kde vznikl** (nebyl tam přístup k npm registry). Před nasazením proto lokálně jednou spusť:

```bash
npm install
npm run build
```

Pokud build projde, je vše připravené k pushi a nasazení podle kroků výše.
