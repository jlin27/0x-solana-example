import { config as dotenv } from "dotenv";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import fetch from "node-fetch";

// === Load ENV Variables ===
dotenv({ quiet: true });
const { ZEROEX_API_KEY, PRIVATE_KEY, RPC_API_KEY } = process.env;

if (!ZEROEX_API_KEY || !PRIVATE_KEY || !RPC_API_KEY) {
  throw new Error(
    "Missing ZEROEX_API_KEY, PRIVATE_KEY, or RPC_API_KEY in .env"
  );
}

const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${RPC_API_KEY}`;
const connection = new Connection(RPC_URL, "confirmed");
const takerKeypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

// === Step 1: Get a Quote ===
async function getQuote(): Promise<any> {
  const response = await fetch(
    "https://staging.api.0x.org/solana/swap-instructions",
    {
      method: "POST",
      headers: {
        "0x-api-key": ZEROEX_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tokenIn: "So11111111111111111111111111111111111111112", // SOL
        tokenOut: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        amountIn: 10000000, // .01 SOL
        taker: takerKeypair.publicKey.toBase58(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch quote: ${response.statusText}`);
  }

  return response.json();
}

// === Step 2: Build Instructions ===
function decodePubkey(bytes: number[]): PublicKey {
  return new PublicKey(Uint8Array.from(bytes));
}

function buildInstructions(instructionsData: any[]): TransactionInstruction[] {
  return instructionsData.map((ix) => {
    const keys = ix.accounts.map((acc: any) => ({
      pubkey: decodePubkey(acc.pubkey),
      isSigner: acc.is_signer,
      isWritable: acc.is_writable,
    }));

    const programId = decodePubkey(ix.program_id);
    const data = Buffer.from(ix.data);

    return new TransactionInstruction({ keys, programId, data });
  });
}

// === Step 3: Send the Transaction ===
async function executeSwap() {
  const quote = await getQuote();
  const instructions = buildInstructions(quote.instructions);
  const latestBlockhash = await connection.getLatestBlockhash();

  // Create transaction message
  const messageV0 = new TransactionMessage({
    payerKey: takerKeypair.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToV0Message(); // No ALT

  // Create versioned transaction
  const versionedTx = new VersionedTransaction(messageV0);
  versionedTx.sign([takerKeypair]);

  const signature = await connection.sendTransaction(versionedTx, {
    maxRetries: 2, // Increase retries for better chance of landing
    skipPreflight: false, // Enable preflight checks to catch errors
  });

  await connection.confirmTransaction(signature, "confirmed");
  console.log(`✅ Swap complete. https://solscan.io/tx/${signature}`);
}

// === Run ===
executeSwap().catch(console.error);
