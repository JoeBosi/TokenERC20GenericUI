# Protected Wallet — come funziona l'MVP di protezione chiavi

> Documento di progetto. Descrive lo stato attuale del codice in
> `api/_lib/signer.js`, `api/wallet.js`, `web3-contract-tester/src/components/ProtectedWallet.jsx`.
> Per la teoria generale (riusabile in altri progetti) vedi [SECRETS.md](./SECRETS.md).

---

## 1. A cosa serve

Il pannello **Protected Wallet** (in alto a sinistra nell'app) è la
dimostrazione pratica del vero obiettivo di questo repository: non è "un
contract tester con un pannello in più", è un **MVP di un prodotto di
protezione chiavi**, e il contract tester è solo il client di dimostrazione.

La promessa che dimostra: **un server può possedere un wallet operativo —
mostrare un indirizzo, firmare messaggi, in futuro firmare transazioni — senza
che la chiave privata transiti mai nel browser**, nemmeno per un istante,
nemmeno cifrata.

Oggi la chiave è simulata (un wallet `ethers.Wallet` che vive nel processo
server). L'interfaccia con cui la calling-code la usa, però, è **identica** a
quella che useresti con AWS KMS in produzione — è questo il punto: il passaggio
da "demo" a "produzione" non richiede di riscrivere l'app, solo di sostituire
cosa c'è dietro un'unica cucitura (seam) di codice.

---

## 2. Come funziona — passo per passo

```
┌─────────────┐   GET /api/wallet           ┌──────────────────┐   getAddress()   ┌──────────────────┐
│   Browser   │ ───────────────────────────▶│  api/wallet.js    │ ───────────────▶ │ api/_lib/signer.js│
│ (React UI)  │                              │  (serverless fn) │                  │  (la "seam")      │
│             │ ◀─────────────────────────── │                  │ ◀─────────────── │                   │
└─────────────┘   { address, provider }      └──────────────────┘   address         └──────────────────┘
                                                                                              │
       │  POST /api/wallet { message }                                                       │ holds the
       ▼                                                                                      │ ethers.Wallet
┌─────────────┐                              ┌──────────────────┐   signMessage()   ┌─────────▼────────┐
│   Browser   │ ───────────────────────────▶ │  api/wallet.js    │ ───────────────▶ │  PRIVATE KEY      │
│             │ ◀─────────────────────────── │                  │ ◀─────────────── │  (mai inviata)    │
└─────────────┘  { signature } (no key!)     └──────────────────┘   signature       └──────────────────┘
```

1. **Caricamento pannello** — `ProtectedWallet.jsx` monta e fa
   `GET /api/wallet`.
2. **Endpoint serverless** (`api/wallet.js`) chiama
   `signer.getAddress()` e risponde con `{ address, provider }`. Sono entrambi
   dati pubblici: l'indirizzo di un wallet è per definizione pubblico, e
   `provider` dice solo *quale meccanismo* protegge la chiave (`local` oggi,
   `kms` in futuro) — mai un segreto.
3. **L'utente scrive un messaggio** e clicca "Sign on the server" →
   `POST /api/wallet { message }`.
4. **Validazione lato server**: il messaggio deve essere una stringa non vuota,
   max 280 caratteri (`api/wallet.js`). Niente arriva al firmatario senza
   controllo di forma.
5. **Firma**: `signer.signMessage(message)` produce una firma ECDSA standard
   Ethereum (EIP-191 `personal_sign`) **dentro il processo server**. La chiave
   privata non lascia mai `api/_lib/signer.js`.
6. **Risposta**: `{ address, message, signature, provider }`. Il browser
   riceve la firma — un blob di 65 byte non invertibile — non la chiave.
7. **Verifica possibile da chiunque**: con `ethers.verifyMessage(message,
   signature)` chiunque (anche lato client) può confermare che la firma
   corrisponde a `address`, senza che nessuno debba mai vedere la chiave. È
   così che si dimostra "il server controlla questo wallet" senza dover
   "fidarsi" — è matematica, non fiducia.

---

## 3. Librerie usate

| Libreria | Dove | Perché |
|---|---|---|
| **ethers.js v6** (`^6.13.0`) | `api/_lib/signer.js`, root `package.json` | Genera/carica il wallet (`ethers.Wallet`), produce le firme (`signMessage`, `signTransaction` — quest'ultima esposta nel seam ma non ancora collegata a un endpoint), e permette la verifica (`ethers.verifyMessage`). Nessuna primitiva crypto è scritta a mano: ethers implementa secp256k1/ECDSA/keccak secondo le specifiche Ethereum, evitando la classe di bug più pericolosa (crypto custom) |
| **Vercel Serverless Functions** (Node.js runtime) | `api/wallet.js`, `api/_lib/*` | Host del codice "seam" — un ambiente server isolato dal browser, dove process.env e la memoria del processo non sono mai visibili al client |
| **React 18** | `ProtectedWallet.jsx` | Solo `fetch` nativo per parlare con `/api/wallet` — nessun SDK wallet (no ethers nel componente!): il frontend non ha *nessun* motivo di importare ethers per questo pannello, perché non gestisce mai chiavi o firme grezze da costruire |

Nota architetturale: **il frontend di questo pannello non importa `ethers` per niente**. Questo è intenzionale — se un domani qualcuno aggiungesse "per comodità" una chiave nel frontend, la prima cosa che lo renderebbe sospetto è proprio la presenza di `ethers.Wallet` lato client. La sua assenza è una garanzia, non un caso.

---

## 4. Come si garantisce la sicurezza

Il meccanismo di protezione si basa su **due principi separati**, non uno:

### a) Confinamento (oggi)
La chiave esiste in un solo posto: la memoria del processo serverless,
dentro `api/_lib/signer.js`. Nessun altro file del progetto fa
`new ethers.Wallet(qualcosaDiSegreto)` — è una ricerca grep verificabile:
```
grep -r "ethers.Wallet(" --include=*.js --include=*.jsx .
```
Questo è il pattern **single seam**: tutto il resto del codice chiama
`signer.getAddress()` / `signer.signMessage()`, mai `process.env.OPERATOR_PRIVATE_KEY`
direttamente. Un solo file da controllare, un solo file da sostituire.

### b) Non-esportabilità (l'obiettivo finale, non ancora implementato)
Il confinamento da solo **non basta** per chiavi di vero valore — se un
attaccante ottiene esecuzione di codice sul server, può comunque leggere
`process.env` o la memoria e portarsi via la chiave per sempre. Per questo il
seam è progettato per essere sostituito con **AWS KMS** (`ECC_SECG_P256K1`):
la chiave nasce dentro l'HSM gestito da AWS e **non può essere esportata da
nessuno**, nemmeno da un account AWS root compromesso, se configurato
correttamente. Il server smette di "possedere" la chiave e inizia solo a
"chiedere una firma" (`kms.Sign(digest)`), che è una richiesta revocabile
(togli il permesso IAM → il server non può più firmare, istantaneamente).

**Punto cruciale**: oggi siamo al punto (a), non al punto (b). Questo è
dichiarato esplicitamente nei commenti del codice (`signer.js`):

> *"the 'local' provider is a stand-in so the flow is demonstrable today. It
> must ONLY ever hold a throwaway testnet key. Never point it at a key with
> real value."*

### Quanto è sicuro, oggi, in pratica
| Aspetto | Stato attuale | Livello |
|---|---|---|
| La chiave lascia mai il processo server? | No | ✅ Buono |
| La chiave è mai loggata/visibile nelle risposte HTTP? | No (solo `address` e `signature`) | ✅ Buono |
| La chiave è esportabile da chi ha accesso al server? | **Sì** (è un `ethers.Wallet` in memoria/env var) | ⚠️ Solo demo |
| C'è autenticazione su chi può chiedere una firma? | **No** — l'endpoint è pubblico | ⚠️ Da aggiungere prima di qualsiasi uso reale |
| C'è rate limiting? | No | ⚠️ Da aggiungere |
| C'è audit log delle firme prodotte? | No | ⚠️ Da aggiungere |

In una frase: **il flusso è corretto e riusabile, la robustezza del
custode-chiave di oggi (`local`) non lo è** — ed è dichiarato così di
proposito, perché lo scopo di questa fase è provare il contratto
dell'interfaccia, non custodire valore.

---

## 5. Punti di vulnerabilità (onesti, oggi)

1. **Chiave in chiaro nel processo server.** Qualsiasi RCE, leak di
   variabili d'ambiente (log accidentale, crash dump, endpoint di debug
   dimenticato) espone la chiave per intero, e una chiave privata Ethereum
   rubata è **irrevocabile**: chi la ottiene controlla il wallet per sempre.
   *Mitigazione pianificata*: passare a `SIGNER_PROVIDER=kms` (vedi
   [SECRETS.md, Tier 3](./SECRETS.md#tier-3--quando-aggiungi-il-wallet-firmatario-leggi-prima-di-farlo)).
2. **Nessuna autenticazione su `/api/wallet`.** Chiunque conosca l'URL pubblico
   può chiedere "firma questo messaggio" e ottenere una firma valida
   dall'indirizzo protetto. Per una demo va bene (non c'è valore da rubare),
   ma è il primo gap da chiudere prima di qualsiasi uso con fondi reali:
   serve un controllo (sessione utente autenticata, API key, o policy su
   *cosa* si può far firmare).
3. **Nessun rate limiting.** Un attaccante può inondare l'endpoint di
   richieste di firma. Oggi è solo fastidio architetturale; con un KMS reale
   (a pagamento per ogni `Sign`) diventerebbe anche un costo.
4. **Nessun audit log.** Se la chiave venisse comunque abusata, oggi non c'è
   modo di rispondere a "chi ha firmato cosa, quando, da dove". Un KMS reale
   risolve parte del problema (CloudTrail logga ogni `Sign`), ma va comunque
   collegato ad alerting.
5. **`signTransaction()` esiste già nel seam ma non è collegato a nessun
   endpoint.** Scelta deliberata: meno superficie d'attacco finché non serve
   davvero firmare transazioni on-chain. Quando servirà, dovrà nascere già con
   autenticazione e limiti (es. whitelisting dei contratti/metodi firmabili),
   non aggiunti dopo.
6. **Validazione del messaggio solo sulla lunghezza.** Non c'è controllo sul
   *contenuto* — un firmatario "reale" potrebbe in teoria essere indotto a
   firmare un messaggio che ha un significato diverso altrove (signature
   misuse/replay in un contesto diverso da questa demo). Da tenere a mente se
   il messaggio firmato dovesse mai avere valore legale o finanziario altrove.

Nessuno di questi punti è "rotto" rispetto allo scopo dichiarato della demo
(provare il flusso). Sono però la lista esatta di cose da chiudere **prima**
di collegare questo seam a una chiave con valore reale.

---

## 6. Walkthrough dell'interfaccia — sezione per sezione

> Nota sugli screenshot: le immagini sono state catturate da una sessione live
> dell'app in Dev Mode su Polygon Amoy e mostrate nella conversazione di
> sviluppo. I file vanno salvati in [`screenshots/`](./screenshots/) con i nomi
> indicati sotto — vedi [screenshots/README.md](./screenshots/README.md) per
> come rigenerarli.

### 6.1 Vista iniziale (wallet non connesso)
![Vista disconnessa](./screenshots/01-disconnected-overview.png)

Cosa mostra: il **Protected Wallet** è già attivo (non richiede connessione
wallet utente — è un wallet *server-side*, indipendente da MetaMask) e mostra
"Loading…" mentre recupera l'indirizzo da `/api/wallet`. Sotto, il pannello
**Wallet** chiede di scegliere come l'utente vuole collegarsi (MetaMask o Dev
Mode). A destra, **Contract Methods** mostra tutti i metodi del contratto ma
disabilitati ("Connect wallet to execute") — il contratto è già caricato
(indirizzo + ABI persistiti in `localStorage`), ma leggerlo richiede un
provider RPC che arriva solo dopo la connessione.

A cosa serve: dimostra visivamente che il pannello di protezione chiavi è
**indipendente** dal flusso "utente connette il proprio wallet" — sono due
cose distinte: uno è il wallet *dell'utente* (MetaMask), l'altro è il wallet
*del server* che dimostra la firma protetta.

### 6.2 Dopo la connessione (Dev Mode) — lettura dati on-chain
![Vista connessa con auto-read](./screenshots/02-connected-autoread.png)

Cosa mostra: l'header in alto ora mostra l'indirizzo collegato, il saldo POL
(100.3875) e il saldo token (10648.3050). Nel pannello **Contract Methods**, i
metodi di sola lettura senza parametri (`name`, `symbol`, `totalSupply`,
`paused`) si sono auto-eseguiti e mostrano "Current value" — questi si
aggiornano da soli ogni 10 secondi, senza bisogno di cliccare nulla.

A cosa serve: è la sezione "read" del contract tester — permette di
ispezionare lo stato pubblico di un contratto senza spendere gas, utile per
verificare rapidamente che un deploy sia configurato correttamente.

### 6.3 Protected Wallet — firma prodotta
![Firma prodotta server-side](./screenshots/03-protected-wallet-signature.png)

Cosa mostra: dopo aver scritto un messaggio e cliccato "Sign on the server",
appare la firma (`0xa7d5a28a2168...`) in un riquadro verde, con la nota
"The browser received a signature — never the key." Il tag verde
"provider: local (simulated)" dichiara onestamente che oggi il custode è
simulato, non un KMS di produzione.

A cosa serve: è la prova visiva del concetto centrale del documento — una
firma valida, prodotta da una chiave che il browser non ha mai visto.
Chiunque può prendere `address`, `message` e `signature` mostrati qui e
verificarli indipendentemente con `ethers.verifyMessage()`.

### 6.4 Roles — ispezione permessi AccessControl
![Sezione Roles](./screenshots/04-roles-explorer.png)

Cosa mostra: la lista dei ruoli OpenZeppelin `AccessControl` del contratto
(`DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, ecc.), con un campo per controllare se un
indirizzo qualsiasi possiede un ruolo, e un campo per aggiungere un ruolo
"custom" (es. `TEST_ROLE`, visibile con il badge "custom") calcolando in
automatico il suo hash `keccak256`.

A cosa serve: utile quando si testano contratti con permessi — verificare "chi
può fare cosa" senza dover leggere il codice Solidity o usare Etherscan
manualmente.

### 6.5 Address Monitor
![Address Monitor](./screenshots/05-address-monitor.png)

Cosa mostra: 5 slot dove inserire indirizzi da monitorare in parallelo —
ciascuno mostrerebbe saldo POL, saldo token e ruoli attivi, aggiornati
periodicamente. Il pulsante "Reset saved information" (con conferma) svuota
tutti gli slot.

A cosa serve: comodo per confrontare più wallet contemporaneamente durante un
test (es. mittente e destinatario di un `transfer`) senza dover cambiare
account in MetaMask continuamente.

### 6.6 Un metodo "write" espanso
![Metodo write espanso](./screenshots/06-write-method-expanded.png)

Cosa mostra: cliccando su un metodo che modifica lo stato (qui `approve`,
sezione blu "WRITE"), si espandono i campi per i suoi parametri (`spender`,
`value`) generati automaticamente leggendo l'ABI, e il bottone "Execute Write"
che invierà una vera transazione (con gas) firmata dal wallet *dell'utente*
connesso — non dal Protected Wallet, che oggi firma solo messaggi, non
transazioni di questo tester.

A cosa serve: è la differenza visiva chiave tra **Read** (verde, gratuito,
nessuna firma) e **Write** (nero/blu, costa gas, richiede una firma) — il
pattern che rende l'interfaccia utilizzabile su *qualunque* contratto, non solo
ERC20, semplicemente leggendo l'ABI fornita.

---

## 7. Prossimi passi (non ancora avviati)

- Implementare `SIGNER_PROVIDER=kms` in `api/_lib/signer.js` con AWS KMS
  (bloccato sulla disponibilità di un account AWS).
- Aggiungere autenticazione + rate limiting su `/api/wallet` prima di
  qualunque collegamento a una chiave di valore reale.
- Aggiungere audit log delle firme prodotte.

Vedi anche [SECRETS.md](./SECRETS.md) per la strategia generale che inquadra
questi passi nei tier 2/3/4.
