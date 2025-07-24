# 0x Solana Swap Example

This TypeScript project demonstrates how to interact with the [0x Swap API for Solana](https://docs.0x.org) to get a quote, build swap instructions, and send a swap transaction.

## ✅ Example Output

```bash
➜  0x-solana-example git:(main) ✗ npm run example

> 0x-solana-example@1.0.0 example
> tsx src/index.ts

✅ Swap complete. https://solscan.io/tx/5eBLpWokqqCuaZR7Uv3k6eNbaxjLYgGBevEcREZkYjTdc2KWp6ZYk9Z44rG4LbkjR3u4DELd9RZSc52AK1mUyxLN
````

## 🧪 What It Does

This script performs the following steps:

1. Loads environment variables (API keys, private key).
2. Fetches a swap quote from the 0x `/quote` endpoint.
3. Parses and builds transaction instructions based on the quote.
4. Sends a transaction to the Solana blockchain to execute the swap.

## 🚀 Getting Started

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
PRIVATE_KEY="your-base58-solana-private-key" # `PRIVATE_KEY` must be base58-encoded
RPC_API_KEY="your-helius-api-key" # Get a free RPC key from [Helius](https://www.helius.dev/).
```

### 4. Run the Example

```bash
npm run example
```

## 📝 Notes

* This script uses legacy `Transaction` and not `VersionedTransaction`. For swaps using address lookup tables (ALTs), additional handling may be needed.
* The amount and token mint addresses are hardcoded for simplicity (SOL → USDC), but can be parameterized.


