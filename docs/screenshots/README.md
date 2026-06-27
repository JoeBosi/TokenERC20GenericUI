# Screenshots

Le immagini referenziate da [`protected-wallet-mvp.md`](../protected-wallet-mvp.md)
non sono ancora presenti in questa cartella: il tool di anteprima browser usato
in sessione le mostra in chat ma non può salvarle come file binari direttamente
nel repository. Vanno aggiunte manualmente (es. salvando le immagini mostrate
durante la sessione, o ricatturandole) con questi nomi esatti:

| File | Cosa mostra | Come ricrearlo |
|---|---|---|
| `01-disconnected-overview.png` | Vista app appena caricata, nessun wallet connesso | Apri `http://localhost:5173` senza connettere nulla |
| `02-connected-autoread.png` | Dopo "Test Dev Mode": header con saldi POL/token, valori auto-letti (`name`, `symbol`, `totalSupply`, `paused`) | Connetti Dev Mode, attendi ~2s che i valori si popolino |
| `03-protected-wallet-signature.png` | Pannello Protected Wallet dopo aver cliccato "Sign on the server" | Clicca "Sign on the server" col messaggio di default |
| `04-roles-explorer.png` | Sezione Roles con la lista ruoli e un ruolo custom | Scrolla alla sezione Roles dopo aver caricato l'ABI ERC20 Preset |
| `05-address-monitor.png` | Sezione Address Monitor (5 slot indirizzo) | Scrolla in fondo alla colonna sinistra |
| `06-write-method-expanded.png` | Un metodo write (es. `approve`) espanso con i suoi campi parametro | Nella colonna Contract Methods, clicca su un metodo "WRITE" |

Una volta aggiunti i file, i link in `protected-wallet-mvp.md` si risolveranno
automaticamente (path relativo `./screenshots/NN-nome.png`).
