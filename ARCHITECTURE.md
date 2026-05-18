# Architecture Documentation

Technical architecture and design decisions for the Web3 Contract Tester Dashboard.

**Author**: Giuseppe Bosi

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Browser                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Application (SPA)                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │   Wallet    │  │  Contract   │  │   Method     │  │  │
│  │  │  Connector  │  │    Input    │  │  Executor    │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  │  │
│  │         │                │                │          │  │
│  │         └────────────────┴────────────────┘          │  │
│  │                          │                           │  │
│  │                   ┌──────┴──────┐                     │  │
│  │                   │   Hooks   │                     │  │
│  │                   │ ┌─────────┐│                     │  │
│  │                   │ │useWallet││                     │  │
│  │                   │ │useContract│                   │  │
│  │                   │ └─────────┘│                     │  │
│  │                   └──────┬──────┘                     │  │
│  │                          │                           │  │
│  │                   ┌──────┴──────┐                     │  │
│  │                   │  Ethers.js  │                     │  │
│  │                   └──────┬──────┘                     │  │
│  └──────────────────────────┼────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────┼────────────────────────────┐  │
│  │     MetaMask Extension   │    LocalStorage             │  │
│  │         (Wallet)         │  ┌─────────────────────┐  │  │
│  └──────────────────────────┘  │ • Contract Address  │  │  │
│                                │ • ABI JSON          │  │  │
│                                │ • Monitored Addrs   │  │  │
│                                │ • Custom Roles      │  │  │
│                                └─────────────────────┘  │  │
│                                                         │  │
└─────────────────────────────────────────────────────────┘  │
                            │                                │
                            ▼                                │
┌─────────────────────────────────────────────────────────┐  │
│              Polygon Amoy Testnet                        │  │
│              (Chain ID: 80002)                          │  │
│  ┌─────────────────────────────────────────────────┐    │  │
│  │         Smart Contract (ERC20/Generic)          │    │  │
│  └─────────────────────────────────────────────────┘    │  │
└─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Wallet Connection Flow

```
User clicks "Connect"
       │
       ▼
┌──────────────┐
│ MetaMask     │───► eth_requestAccounts
│ Extension    │
└──────────────┘
       │
       ▼
┌──────────────┐
│ useWallet    │───► Validates network (Chain ID: 80002)
│ Hook         │───► Fetches POL balance
└──────────────┘
       │
       ▼
┌──────────────┐
│ App State    │───► Updates UI with wallet info
│ Update       │───► Shows address, balance badges
└──────────────┘
```

### 2. Contract Configuration Flow

```
User enters contract address + ABI
       │
       ▼
┌──────────────┐
│ useContract  │───► Validates ABI JSON
│ Hook         │───► Parses ABI with ethers.Interface
└──────────────┘
       │
       ▼
┌──────────────┐
│ Categorize   │───► view/pure → Read Methods
│ Functions    │───► payable/nonpayable → Write Methods
└──────────────┘
       │
       ▼
┌──────────────┐
│ LocalStorage │───► Persists address & ABI
│ Save         │───► Auto-reload on next visit
└──────────────┘
       │
       ▼
┌──────────────┐
│ Method       │───► Generates dynamic forms
│ Executor     │───► Ready for interaction
└──────────────┘
```

### 3. Method Execution Flow

**Read Method**:
```
User clicks "Execute Read"
       │
       ▼
┌──────────────┐
│ Ethers.js    │───► contract.name() [view call]
│ Contract Call│───► No gas required
└──────────────┘
       │
       ▼
┌──────────────┐
│ Format Result│───► Apply decimal formatting
└──────────────┘
       │
       ▼
┌──────────────┐
│ Display      │───► Show in UI
└──────────────┘
```

**Write Method**:
```
User clicks "Execute Write"
       │
       ▼
┌──────────────┐
│ Build Tx     │───► contract.mint.populateTransaction()
│ Data         │
└──────────────┘
       │
       ▼
┌──────────────┐
│ MetaMask     │───► User confirms transaction
│ Prompt       │───► Gas estimation shown
└──────────────┘
       │
       ▼
┌──────────────┐
│ Send Tx      │───► Broadcast to Polygon Amoy
└──────────────┘
       │
       ▼
┌──────────────┐
│ Wait Receipt │───► Update UI with tx hash
└──────────────┘
```

---

## Custom Hooks

### useWallet

**Purpose**: Manages wallet connection state and blockchain provider.

**State**:
- `account`: Connected wallet address
- `provider`: Ethers BrowserProvider instance
- `signer`: Transaction signer
- `polBalance`: Native POL balance
- `isConnecting`, `isConnected`, `isCorrectNetwork`: UI states
- `isDevMode`: Development testing mode

**Key Methods**:
- `connect()`: Connect to MetaMask
- `connectDev()`: Activate dev mode with mock wallet
- `disconnect()`: Reset connection state
- `fetchBalances()`: Refresh POL and token balances

**Network Handling**:
```javascript
// Automatic network detection and switching
if (chainId !== '0x13882') {
  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0x13882' }]
  });
}
```

### useContract

**Purpose**: Manages contract instance and ABI parsing.

**State**:
- `contractAddress`: Target contract address
- `abi`: Contract ABI (JSON)
- `contract`: Ethers Contract instance
- `readMethods`: Array of view/pure functions
- `writeMethods`: Array of payable/nonpayable functions
- `autoReadValues`: Cached results from auto-executed read methods

**Key Methods**:
- `loadErc20Preset()`: Load standard OpenZeppelin ERC20 ABI
- `refreshReadValues()`: Re-execute auto-read methods
- `watchAsset()`: Add token to MetaMask via wallet_watchAsset

**ABI Parsing Logic**:
```javascript
// Categorize by stateMutability
const isRead = ['view', 'pure'].includes(fn.stateMutability);
const isWrite = ['payable', 'nonpayable'].includes(fn.stateMutability);
```

---

## Component Architecture

### WalletConnector

**Responsibilities**:
- Display connection status
- Handle connect/disconnect actions
- Show network badge
- Error message display

**Props**:
```typescript
{
  account: string | null;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  isDevMode: boolean;
  error: string | null;
  onConnect: () => void;
  onConnectDev: () => void;
  onDisconnect: () => void;
}
```

### ContractInput

**Responsibilities**:
- Contract address input
- ABI textarea with validation
- Load preset button
- Clear data button

**Features**:
- Auto-save to localStorage on change
- JSON validation for ABI
- Character count display

### MethodExecutor

**Responsibilities**:
- Display categorized methods (Read/Write)
- Generate dynamic parameter forms
- Execute calls and transactions
- Display results and errors

**Dynamic Form Generation**:
```javascript
// For each function parameter
fn.inputs.map((input, idx) => (
  <input
    key={idx}
    placeholder={`${input.name} (${input.type})`}
    onChange={(e) => updateParam(idx, e.target.value)}
  />
));
```

---

## State Management

### Local Storage Keys

| Key | Data | Purpose |
|-----|------|---------|
| `w3ct_contract_address` | string | Saved contract address |
| `w3ct_contract_abi` | string | Saved ABI JSON |
| `w3ct_custom_roles` | JSON object | User-defined role hashes |
| `w3ct_monitored_addresses` | string[] | 5 tracked addresses |

### React State Flow

```
┌─────────────────────────────────────────┐
│              App.jsx                    │
│  ┌─────────────────────────────────┐   │
│  │   useWallet() → wallet state    │   │
│  │   useContract() → contract state  │   │
│  └─────────────────────────────────┘   │
│              │                          │
│    ┌─────────┼─────────┐               │
│    ▼         ▼         ▼               │
│ ┌──────┐ ┌──────┐ ┌──────────┐        │
│ │Wallet│ │Contract│ │ Method   │        │
│ │Conn. │ │Input   │ │Executor  │        │
│ └──────┘ └──────┘ └──────────┘        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  RoleExplorer (internal)        │   │
│  │  AddressMonitor (internal)      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## Security Model

### Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Private key exposure | No keys stored; all signing via MetaMask |
| Man-in-the-middle | HTTPS enforced; RPC via official Polygon endpoints |
| Contract address spoofing | User must verify address; no auto-discovery |
| Malicious ABI injection | JSON validation; no code execution from ABI |
| LocalStorage XSS | No user-generated HTML rendering |

### Data Privacy

- No data sent to external servers
- All contract interactions direct to blockchain
- No analytics or tracking
- localStorage cleared on browser data clear

---

## Performance Optimizations

### 1. Lazy Evaluation

Contract methods are parsed on-demand when ABI changes, not on every render.

### 2. Debounced Inputs

Contract address and ABI inputs use debounced save to localStorage (300ms).

### 3. Conditional Refresh

Address Monitor refreshes every 10 seconds only when visible and wallet connected.

### 4. Minimal Re-renders

- Hooks return memoized values
- Components use shallow comparison where appropriate
- Large lists (methods) use stable keys

---

## Error Handling Strategy

### Levels

1. **User Input**: Inline validation, red borders, helper text
2. **Network**: Toast-style notifications, retry buttons
3. **Contract Calls**: Try-catch with user-friendly error messages
4. **Critical**: Fallback UI, manual reset button

### Error Categories

| Category | Example | Handling |
|----------|---------|----------|
| User | Invalid address | Input validation |
| Network | RPC timeout | Retry with exponential backoff |
| Contract | Revert reason | Display decoded error |
| System | MetaMask not found | Prompt installation |

---

## Design Decisions

### Why Inline Styles?

- **No build configuration**: No CSS processor setup required
- **Dynamic values**: Easy to compute styles based on state
- **Scope isolation**: No class name conflicts
- **Apple aesthetic**: Precise control over every pixel

### Why Ethers.js v6?

- Smaller bundle size than v5
- Tree-shaking support
- Modern ES modules
- Better TypeScript support

### Why No State Management Library?

- Application scope is contained
- React Context not needed (prop drilling is shallow)
- Custom hooks provide sufficient abstraction
- Reduced bundle size

### Why Polygon Amoy?

- Low gas costs for testing
- Fast block times (~2 seconds)
- Reliable testnet infrastructure
- Easy faucet access

---

## Future Considerations

### Potential Enhancements

1. **Multi-chain Support**: Abstract network configuration
2. **Contract Verification**: Auto-fetch verified ABI from PolygonScan
3. **Event Listening**: Real-time event monitoring
4. **Transaction History**: Local log of executed transactions
5. **Gas Estimation**: Pre-flight gas cost calculation

### Technical Debt

1. **Inline Styles Migration**: Consider CSS-in-JS for maintainability
2. **Test Coverage**: Add unit tests for hooks
3. **TypeScript**: Gradual migration for type safety
4. **Error Boundaries**: Add React error boundaries for resilience

---

## References

- [Ethers.js v6 Documentation](https://docs.ethers.org/v6/)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [MetaMask Wallet API](https://docs.metamask.io/wallet/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
