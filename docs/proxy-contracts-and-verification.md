# Contratti proxy e verifica su Polygonscan — come ottenere un'ABI leggibile

> Documento educativo/teorico. Non descrive codice di questo repository
> (che è solo il client di test, senza contratti Solidity al suo interno),
> ma il problema generale che ha causato il bug "ABI senza funzioni" visto
> in [protected-wallet-mvp.md](./protected-wallet-mvp.md) e in
> `web3-contract-tester/src/components/ContractInput.jsx`.

---

## 1. Perché un contratto proxy ha un'ABI "vuota"

Molti contratti moderni (incluso il tuo token, a giudicare dal bug) non sono
deployati come un singolo contratto, ma come **due contratti separati**:

```
┌──────────────────┐  delegatecall   ┌────────────────────────┐
│   Proxy (ERC1967) │ ───────────────▶│  Implementation         │
│   l'indirizzo che  │                 │  (la vera logica ERC20: │
│   l'utente usa      │ ◀─────────────  │  transfer, approve...) │
└──────────────────┘   return data    └────────────────────────┘
```

- Il **proxy** è l'indirizzo "pubblico", quello che metti nel campo
  "Contract Address" di questo tester. Il suo codice Solidity contiene
  solo un `constructor` e una `fallback()` che fa `delegatecall` verso
  l'implementation. **Non contiene `transfer`, `approve`, `name`, ecc.**
- L'**implementation** contiene la vera logica del token. Le funzioni vere
  esistono *solo* nel suo bytecode/ABI.

Quando chiedi a Polygonscan "dammi l'ABI di questo indirizzo" (`getabi`) su
un proxy, ti restituisce — correttamente — l'ABI del proxy: zero funzioni
utili. Questo è il motivo esatto del bug "Enter a valid ABI with functions"
che hai visto.

---

## 2. Le due strade per risolverlo alla radice

### Strada A — Non ti serve l'upgradeability: niente proxy

Se il motivo per cui il contratto è dietro un proxy era solo "il wizard/tool
che ho usato lo fa di default", la soluzione più semplice è **deployare un
contratto non-upgradeable**, cioè senza proxy:

- **OpenZeppelin Wizard** (wizard.openzeppelin.com): nella sezione
  "Upgradeability" seleziona **"None"** invece di "Transparent"/"UUPS".
- **Hardhat**: deploy diretto con `contract.deploy()`, senza il plugin
  `@openzeppelin/hardhat-upgrades`.
- **Remix**: deploy diretto del contratto ERC20 tramite "Deploy & Run
  Transactions", senza passare da `ERC1967Proxy`.

Risultato: un solo indirizzo, un solo contratto, un'unica ABI verificabile e
recuperabile da Polygonscan con un click — esattamente il caso che oggi
funziona già in questo tester (vedi "ERC20 Preset" come riferimento di cosa
ti aspetti di ottenere).

**Costo di questa scelta**: se in futuro trovi un bug nel contratto, non
potrai aggiornarne la logica — dovrai deployarne uno nuovo e migrare gli
utenti. Per un token "semplice" e stabile è spesso la scelta giusta.

### Strada B — Ti serve l'upgradeability: tieni il proxy, ma verifica e collega l'implementation

Se l'upgradeability è una scelta voluta (es. vuoi poter correggere bug senza
cambiare indirizzo), il proxy resta, ma devi fare **due cose aggiuntive**
che il deploy "base" non fa da solo:

1. **Verifica il contratto implementation separatamente**, con lo stesso
   codice sorgente e le stesse impostazioni del compilatore usate per il
   proxy. Senza questo passo l'ABI reale non esiste *da nessuna parte* su
   Polygonscan — è esattamente quello che è successo nel tuo caso (campo
   `Implementation` presente, ma `"Contract source code not verified"`).
2. **Collega il proxy alla sua implementation** sulla UI di Polygonscan:
   pagina del contratto proxy → tab "Contract" → "More Options" →
   **"Is this a proxy?"** → Polygonscan rileva lo slot EIP-1967 e chiede
   conferma dell'indirizzo implementation. Una volta confermato, l'azione
   `getabi`/"Read as Proxy" su Polygonscan (e quindi anche le chiamate API
   che fa questo tester) restituiscono l'ABI vera.

#### Come farlo con gli strumenti più comuni

**Hardhat + `@openzeppelin/hardhat-upgrades`**
```bash
# 1. Deploy (crea sia proxy che implementation)
npx hardhat run scripts/deploy.js --network amoy

# 2. Recupera l'indirizzo implementation
npx hardhat console --network amoy
> await upgrades.erc1967.getImplementationAddress("0xPROXY_ADDRESS")

# 3. Verifica ENTRAMBI — il plugin gestisce il collegamento automaticamente
npx hardhat verify --network amoy 0xPROXY_ADDRESS
# (il plugin verifica l'implementation e marca il proxy su Etherscan/Polygonscan)
```

**Remix + plugin "Contract Verification - Etherscan"**
1. Deploy dell'implementation, poi del proxy (`ERC1967Proxy`) che la punta.
2. Verifica il contratto implementation (non il proxy) con il plugin,
   passando il codice sorgente flatten e i parametri del compilatore.
3. Sulla pagina Polygonscan del **proxy**, usa "Is this a proxy?" per
   collegarlo all'implementation appena verificata.

**Foundry**
```bash
forge verify-contract <IMPLEMENTATION_ADDRESS> src/MyToken.sol:MyToken \
  --chain 80002 --etherscan-api-key $POLYGONSCAN_API_KEY
```
poi collega manualmente su Polygonscan come sopra.

---

## 3. Come si comporta oggi questo tester nel frattempo

`ContractInput.jsx` (`fetchAbiFromExplorer`) ora gestisce onestamente
entrambi i casi intermedi, senza bisogno di intervenire sul contratto:

| Situazione rilevata | Comportamento |
|---|---|
| ABI normale, con funzioni | Caricata subito |
| Proxy con implementation verificata | ABI dell'implementation caricata **automaticamente**, indirizzo del proxy mantenuto |
| Proxy con implementation **non verificata** | Messaggio esplicito: "this is a proxy contract pointing to 0x..., but that implementation isn't verified" |
| Proxy **non collegato** su Polygonscan | Messaggio esplicito: "this is a proxy contract... isn't linked to an implementation" |

In tutti i casi senza ABI recuperabile, il workaround immediato resta il
bottone **"ERC20 Preset"**, che carica un'ABI ERC20 standard sufficiente per
interagire con un token che segue l'interfaccia comune — utile finché non
applichi una delle due strade sopra.
