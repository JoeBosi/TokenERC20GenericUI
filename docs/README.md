# Documentation

## A cosa serve questa cartella

Questa cartella raccoglie **due tipi di contenuti**, tenuti separati per scopo:

1. **Documenti di progetto** — cosa è stato costruito e come usarlo: architettura,
   strategia di gestione dei segreti, guida ai test. Servono a chi lavora sul
   codice (oggi tu, in futuro chiunque altro lo riprenda) per capire le scelte
   fatte senza dover rileggere ogni riga di codice o ricostruire il contesto
   da una chat passata.
2. **Documenti educativi/teorici** — spiegano i concetti che stanno *dietro* al
   codice (es. perché una chiave KMS non è "esportabile", come funziona una
   firma ECDSA, cosa significa "blast radius" di un segreto). Servono a
   trasformare il progetto da "funziona" a "capisco perché funziona ed è
   sicuro" — utile sia per imparare, sia per spiegare il prodotto a terzi
   (investitori, utenti tecnici, audit di sicurezza).

Il `README.md` alla radice del repository resta lì per convenzione GitHub
(è la pagina che GitHub mostra automaticamente) e contiene solo l'overview
rapida del progetto + i link a questa cartella. Tutto il resto vive qui.

---

## Indice

### Progetto
| Documento | Cosa contiene |
|---|---|
| [protected-wallet-mvp.md](./protected-wallet-mvp.md) | **Il pezzo più importante**: come funziona il pannello "Protected Wallet", la dimostrazione che una chiave privata può firmare senza mai lasciare il server. Librerie usate, flusso dati, modello di sicurezza, punti di vulnerabilità, walkthrough visivo di tutta l'interfaccia |
| [SECRETS.md](./SECRETS.md) | La strategia generale, riutilizzabile, per proteggere segreti di valore crescente — dalla API key pubblica fino alle chiavi private custodial |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architettura tecnica del frontend (componenti, hook, gestione stato) |
| [TESTING.md](./TESTING.md) | Procedure di test manuale e matrice di copertura 100% in Dev Mode |
| [proxy-contracts-and-verification.md](./proxy-contracts-and-verification.md) | Perché un contratto proxy ha un'ABI "vuota" su Polygonscan, e come deployarlo/verificarlo perché l'ABI reale sia recuperabile |

### Come si collegano tra loro
```
SECRETS.md                  ← strategia generale (teoria, qualsiasi progetto)
   └─ protected-wallet-mvp.md ← applicazione concreta in QUESTO progetto
        └─ api/_lib/signer.js  ← il codice che implementa il seam descritto
```
Se vuoi capire "perché abbiamo scelto questo approccio", parti da `SECRETS.md`.
Se vuoi capire "come funziona la cosa che ho davanti nello schermo", parti da
`protected-wallet-mvp.md`.

---

## Convenzioni per aggiungere nuovi documenti

- Un documento di **progetto** descrive uno stato attuale verificabile nel
  codice — se diventa falso quando il codice cambia, va aggiornato o cancellato.
- Un documento **educativo** spiega un concetto che resta valido anche se il
  codice cambia (es. "come funziona ECDSA" non cambia se sostituiamo ethers.js
  con un'altra libreria).
- Screenshot vanno in [`screenshots/`](./screenshots/), nominati
  `NN-descrizione-breve.png` (numerati nell'ordine in cui compaiono nei documenti).
- Aggiungi sempre la riga nell'indice qui sopra quando crei un nuovo file.
