# Test Manuale - Web3 Contract Tester

## 1. Apri l'applicazione
URL: http://localhost:5173

## 2. Verifica caricamento automatico
- Indirizzo contratto: `0x8Bc73fAe464d4ce567b702571933dFD3F118D53F`
- ABI: 20 funzioni pre-caricate

## 3. Test Dev Mode
1. Clicca **"Test Dev Mode"** (pulsante rosa)
2. Wallet deve mostrare: `0x2d6e...862f`
3. Badge "Modalità Test (Dev)" deve apparire

## 4. Verifica Console (F12 → Console)
Dovresti vedere:
```
[DEBUG] useContract effect triggered: {hasAbi: true, abiLength: ..., contractAddress: "0x8Bc...", hasProvider: true, hasSigner: true}
[DEBUG] ABI parsed, items: 20
[DEBUG] Functions found: 20
[DEBUG] Functions: ['name', 'symbol', 'decimals', 'totalSupply', ...]
[DEBUG] Read methods: 9 [...]
[DEBUG] Write methods: 11 [...]
[DEBUG] Contract instance created
```

## 5. Test Metodi
### Lettura (verde):
- Clicca su **name** → Esegui Lettura
- Risultato: nome del token

- Clicca su **balanceOf** → Inserisci `0x2d6ecb55771f262f99f9df8163910b1968a7862f` → Esegui
- Risultato: balance dell'account

### Scrittura (blu):
- Clicca su **mint** → Inserisci:
  - to: `0x2d6ecb55771f262f99f9df8163910b1968a7862f`
  - amount: `1000000000000000000` (1 token con 18 decimals)
- Esegui Scrittura
- Approva la transazione (se richiesto)

## 6. Problemi Comuni

### "Nessun metodo trovato"
→ Apri DevTools, guarda i log [DEBUG]

### "Contratto non funziona"
→ Verifica che il wallet sia connesso (Test Dev Mode)

### Pulsanti disabilitati
→ Normale se non connessi. Clicca "Test Dev Mode" prima.
