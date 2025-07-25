# 0x Solana Swap Example

This TypeScript project demonstrates how to interact with the [0x Swap API for Solana](https://docs.0x.org) to get a quote, build swap instructions, and send a swap transaction.

## Example Output

```bash
➜  0x-solana-example git:(main) ✗ npm run index

> 0x-solana-example@1.0.0 index
> tsx src/index.ts

✅ Simulation succeeded
🔗 View on Solscan: https://solscan.io/tx/3fM1aQJMpBMK9BKDo58p66FvQQvFMR2LGxEpayDeNkirjB8bgQmvYwQofxdLvkRb28XUkLqs1ab23RjYpKBwV1mC/
✅ Transaction confirmed: https://solscan.io/tx/3fM1aQJMpBMK9BKDo58p66FvQQvFMR2LGxEpayDeNkirjB8bgQmvYwQofxdLvkRb28XUkLqs1ab23RjYpKBwV1mC/
````

## What It Does

This script performs the following steps:

1. Loads environment variables (API keys, private key).
2. Fetches a swap quote from the 0x `/swap-instructions` endpoint.
3. Builds and signs a transaction from the instructions.
4. Simulates the transaction to catch errors before sending.
5. Sends a transaction to the Solana blockchain to execute the swap.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/jlin27/0x-solana-example.git
cd 0x-solana-example
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create a `.env` File

Copy the example below into a new `.env` file:

```dotenv
ZEROEX_API_KEY="your-0x-api-key" 
PRIVATE_KEY="your-base58-solana-private-key" # Must be base58-encoded
RPC_API_KEY="your-helius-api-key" # Get a free RPC key from [Helius](https://www.helius.dev/).
```

### 4. Run the Example

```bash
npm run index
```

## 📝 Notes

* The amount and token mint addresses are hardcoded for simplicity (SOL → USDC), but can be parameterized.


