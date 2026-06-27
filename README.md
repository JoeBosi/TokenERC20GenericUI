# Web3 Contract Tester Dashboard

A client-side Single Page Application (SPA) that enables developers to connect their MetaMask wallet, automatically configure the test network, and dynamically parse any ERC20 or generic smart contract via custom ABI, enabling immediate testing of read and write functions.

**Author**: Giuseppe Bosi

---

## Overview

Web3 Contract Tester is a developer tool designed for rapid smart contract testing on the Polygon Amoy testnet. It provides a clean, Apple-inspired interface for interacting with Ethereum-compatible smart contracts without writing any code.

---

## Key Features

### Wallet Management
- **MetaMask Integration**: Seamless connection via `eth_requestAccounts`
- **Account & Network Monitoring**: Real-time detection of account switches and network changes
- **Logical Disconnect**: Clean UI state reset without browser refresh
- **Dev Mode**: Built-in test mode with a simulated wallet for development

### Network Configuration
- **Automatic Chain Detection**: Verifies Chain ID and prompts for network switch
- **Polygon Amoy Auto-Setup**: Automatically adds the Polygon Amoy testnet (Chain ID: 80002) if not present

### Contract Interaction
- **Dynamic ABI Parsing**: Automatically generates UI forms from any contract ABI
- **Method Categorization**: Separates read methods (view/pure) from write methods (payable/nonpayable)
- **OpenZeppelin Presets**: Instant loading of standard ERC20 ABI for rapid testing
- **Data Persistence**: Contract address and ABI automatically saved to `localStorage`

### Advanced Tools
- **Role Explorer**: Inspect OpenZeppelin AccessControl roles, check role membership, and enumerate role holders
- **Address Monitor**: Track up to 5 addresses with real-time balance and role updates
- **Token Watch**: One-click addition of ERC20 tokens to MetaMask with auto-detected symbol and decimals

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 + Vite 5 |
| Web3 Library | Ethers.js v6 |
| Architecture | Pure client-side SPA |
| Styling | Inline styles (Apple-inspired minimal design) |
| Network | Polygon Amoy Testnet |

---

## Quick Start

### Prerequisites
- Node.js 18+ 
- MetaMask browser extension

### Installation

```bash
# Clone the repository
git clone https://github.com/JoeBosi/TokenERC20GenericUI.git
cd TokenERC20GenericUI

# Install dependencies
cd web3-contract-tester
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

---

## Default Contract (Polygon Amoy)

The application ships with a pre-configured ERC20 test contract on Polygon Amoy:

| Property | Value |
|----------|-------|
| **Address** | [`0x8Bc73fAe464d4ce567b702571933dFD3F118D53F`](https://amoy.polygonscan.com/address/0x8Bc73fAe464d4ce567b702571933dFD3F118D53F) |
| **Network** | Polygon Amoy Testnet |
| **Standard** | ERC20 + OpenZeppelin AccessControl |
| **Explorer** | [View on PolygonScan Amoy](https://amoy.polygonscan.com/address/0x8Bc73fAe464d4ce567b702571933dFD3F118D53F) |

---

## Network Configuration (Polygon Amoy)

| Parameter | Value |
|-----------|-------|
| Network Name | Polygon Amoy Testnet |
| RPC URL | https://rpc-amoy.polygon.technology |
| Chain ID | 80002 (0x13882) |
| Currency Symbol | POL |
| Block Explorer | https://amoy.polygonscan.com |

---

## Project Structure

```
web3-contract-tester/
├── src/
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Entry point
│   ├── index.css            # Global styles
│   ├── hooks/
│   │   ├── useWallet.js     # Wallet connection logic
│   │   └── useContract.js   # Contract interaction logic
│   └── components/
│       ├── WalletConnector.jsx   # Wallet UI component
│       ├── ContractInput.jsx     # Contract configuration
│       └── MethodExecutor.jsx    # Method forms and execution
├── package.json
└── vite.config.js
```

---

## Usage Guide

### 1. Connect Wallet
- Click "Connect MetaMask" to link your wallet
- The app will automatically request network switch to Polygon Amoy if needed
- Or use "Test Dev Mode" for development without a real wallet

### 2. Configure Contract
- Enter the contract address in the input field
- Paste the contract ABI (JSON format) in the textarea
- Or click "Load ERC20 Preset" to use standard OpenZeppelin ERC20 ABI

### 3. Execute Methods
- **Read Methods** (green): Execute view/pure functions without gas cost
- **Write Methods** (blue): Execute transactions requiring MetaMask confirmation

### 4. Monitor Addresses
- Add up to 5 addresses in the Address Monitor panel
- Real-time tracking of POL and token balances
- Automatic role detection for each address

### 5. Explore Roles
- View your current wallet's roles
- Check roles for any address
- Add custom roles by name (keccak256 hash calculated automatically)
- For AccessControlEnumerable contracts, view role member lists

---

## Security Considerations

- **No Private Keys Stored In The Browser**: MetaMask transactions require explicit wallet approval; the browser never holds a private key
- **Serverless API for Secrets**: a small set of Vercel serverless functions (`/api`) keep the Etherscan API key and the demo signing key server-side — see [Secret Management Strategy](docs/SECRETS.md) and [Protected Wallet MVP](docs/protected-wallet-mvp.md)
- **LocalStorage Warning**: Contract addresses and ABIs are stored locally; clear browser data to remove
- **Testnet Only**: Designed for Polygon Amoy testnet — do not use with mainnet funds

---

## Documentation

All project and educational documentation lives in [`docs/`](docs/README.md):

- [Documentation Index](docs/README.md) - what's in this folder and where to start
- [Protected Wallet MVP](docs/protected-wallet-mvp.md) - how the key-protection demo works, libraries, data flow, security model, vulnerabilities
- [Secret Management Strategy](docs/SECRETS.md) - the tiered approach for protecting secrets, from API keys to private keys
- [Architecture](docs/ARCHITECTURE.md) - Technical architecture and design decisions
- [Testing Guide](docs/TESTING.md) - Manual testing procedures and 100% Dev Mode coverage matrix

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

## License

MIT License - See LICENSE file for details

---

## Author

**Giuseppe Bosi**
- GitHub: [@JoeBosi](https://github.com/JoeBosi)

---

## Acknowledgments

- Built with [Ethers.js](https://docs.ethers.org/) for Web3 interactions
- Inspired by OpenZeppelin's contract standards
- Design inspired by Apple's human interface guidelines
