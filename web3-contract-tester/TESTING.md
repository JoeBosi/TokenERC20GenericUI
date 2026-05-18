# Testing Guide

This document provides manual testing procedures for the Web3 Contract Tester Dashboard.

---

## Prerequisites

- Application running at `http://localhost:5173`
- MetaMask browser extension installed
- DevTools console open (F12 → Console) for debug output

---

## Test Scenarios

### Test 1: Application Load

**Objective**: Verify the application loads correctly with auto-saved data.

**Steps**:
1. Open `http://localhost:5173`
2. Verify the contract address field is pre-filled (if previously saved)
3. Verify the ABI field shows the number of loaded functions

**Expected Result**: Application displays with saved contract data pre-populated.

---

### Test 2: Dev Mode Connection

**Objective**: Test wallet connection without MetaMask.

**Steps**:
1. Click **"Test Dev Mode"** (pink button)
2. Check the wallet address displays: `0x2d6e...862f`
3. Verify the "Test Mode (Dev)" badge appears in the header

**Expected Result**: Dev mode activates with simulated wallet address.

---

### Test 3: Console Debug Output

**Objective**: Verify debug logging is working.

**Steps**:
1. Open DevTools (F12) → Console tab
2. Refresh the page with a configured contract

**Expected Console Output**:
```
[DEBUG] useContract effect triggered: {hasAbi: true, abiLength: ..., contractAddress: "0x8Bc...", hasProvider: true, hasSigner: true}
[DEBUG] ABI parsed, items: 20
[DEBUG] Functions found: 20
[DEBUG] Functions: ['name', 'symbol', 'decimals', 'totalSupply', ...]
[DEBUG] Read methods: 9 [...]
[DEBUG] Write methods: 11 [...]
[DEBUG] Contract instance created
```

---

### Test 4: Read Method Execution

**Objective**: Execute view functions without gas cost.

**Steps**:
1. Ensure wallet is connected (Dev Mode or MetaMask)
2. Navigate to the **Read Methods** section (green header)
3. Click on **name** method
4. Click **Execute Read**

**Expected Result**: Token name displays in the result area.

---

### Test 5: Read Method with Parameters

**Objective**: Execute balanceOf with an address parameter.

**Steps**:
1. Navigate to Read Methods
2. Click on **balanceOf**
3. Enter address: `0x2d6ecb55771f262f99f9df8163910b1968a7862f`
4. Click **Execute**

**Expected Result**: Balance amount displays (formatted with decimals).

---

### Test 6: Write Method Execution

**Objective**: Execute a transaction (requires MetaMask in production).

**Steps**:
1. Ensure MetaMask is connected (Dev Mode cannot execute writes)
2. Navigate to **Write Methods** (blue header)
3. Click on **mint**
4. Fill parameters:
   - `to`: `0x2d6ecb55771f262f99f9df8163910b1968a7862f`
   - `amount`: `1000000000000000000` (1 token with 18 decimals)
5. Click **Execute Write**

**Expected Result**: MetaMask prompts for transaction confirmation.

---

### Test 7: Address Monitor

**Objective**: Track multiple addresses simultaneously.

**Steps**:
1. Connect wallet
2. Scroll to **Address Monitor** section
3. Enter up to 5 addresses in the input fields
4. Wait 10 seconds for auto-refresh

**Expected Result**: 
- POL balance displays for each valid address
- Token balance displays (if contract configured)
- Active roles display as tags

---

### Test 8: Role Explorer

**Objective**: Inspect AccessControl roles.

**Steps**:
1. Connect wallet with a contract that has AccessControl
2. Scroll to **Roles** section
3. View current wallet's role status
4. Enter a custom address in "Check address" field
5. Click the checkmark button

**Expected Result**: 
- Role status displays (✓ for has role, — for no role, ? for unknown)
- For AccessControlEnumerable: member count displays with 👤 indicator

---

### Test 9: Custom Role Addition

**Objective**: Add and track custom roles.

**Steps**:
1. In Roles section, find "Add role (clear name)"
2. Enter role name: `WHITELIST_ROLE`
3. Press Enter or click **+**

**Expected Result**: 
- New role appears in the list with "custom" badge
- Role hash is auto-calculated (keccak256)
- Status updates based on wallet's role assignment

---

### Test 10: Token Watch (Add to MetaMask)

**Objective**: Add token to MetaMask wallet.

**Steps**:
1. Connect MetaMask wallet
2. Configure an ERC20 contract
3. Click **"Add to MetaMask"** button

**Expected Result**: MetaMask shows token addition prompt with auto-detected symbol and decimals.

---

## Troubleshooting

### "No methods found"

**Solution**: 
- Open DevTools → Console
- Check [DEBUG] logs for ABI parsing errors
- Verify ABI is valid JSON
- Ensure contract address is correct

### "Contract not working"

**Solution**:
- Verify wallet is connected (check header for address)
- Ensure you're on Polygon Amoy network
- Check console for connection errors

### Buttons disabled

**Solution**:
- This is expected when wallet is disconnected
- Click "Connect MetaMask" or "Test Dev Mode" first

### Transaction fails

**Solution**:
- Verify you have POL for gas
- Check method parameters are correct
- Ensure you have required roles for privileged functions

---

## Network Configuration Test

**Objective**: Verify automatic network handling.

**Steps**:
1. Set MetaMask to a different network (e.g., Ethereum Mainnet)
2. Click "Connect MetaMask"
3. Observe network switch prompt

**Expected Result**: Application detects wrong network and prompts to switch to Polygon Amoy.

---

## Known Limitations

1. **Dev Mode Limitations**: Cannot execute write transactions (no real signer)
2. **Network Limitation**: Currently configured for Polygon Amoy only
3. **Role Updates**: May require manual refresh after transaction
4. **Large ABIs**: Very large contracts may impact UI performance

---

## Test Data

### Sample Contract Address (Amoy Testnet)
```
0x8Bc73fAe464d4ce567b702571933dFD3F118D53F
```

### Sample Address for Testing
```
0x2d6ecb55771f262f99f9df8163910b1968a7862f
```

### Token Amount Examples (18 decimals)
| Tokens | Wei Value |
|--------|-----------|
| 1 | 1000000000000000000 |
| 10 | 10000000000000000000 |
| 0.1 | 100000000000000000 |
