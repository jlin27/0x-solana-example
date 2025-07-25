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
  const response = await fetch("https://staging.api.0x.org/solana/quote", {
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
  });

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

// === Step 3: Send the Transaction using VersionedTransaction with Simulation ===
async function executeSwap() {
  const quote = await getQuote();
  const instructions = buildInstructions(quote.instructions);
  const latestBlockhash = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: takerKeypair.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToV0Message();

  const versionedTx = new VersionedTransaction(messageV0);
  versionedTx.sign([takerKeypair]);

  // === 🧪 Simulate Transaction ===
  const { value: simulationResult } = await connection.simulateTransaction(
    versionedTx,
    {
      sigVerify: true,
    }
  );

  if (simulationResult.err) {
    console.error("❌ Simulation failed:", simulationResult.err);
    if (simulationResult.logs) {
      console.error("🪵 Logs:\n" + simulationResult.logs.join("\n"));
    }
    throw new Error("Aborting due to failed simulation.");
  } else {
    console.log("✅ Simulation succeeded");
  }

  // === 🚀 Send Transaction ===
  const signature = await connection.sendTransaction(versionedTx, {
    skipPreflight: false,
  });

  await connection.confirmTransaction(signature, "confirmed");
  console.log(`✅ Swap complete. https://solscan.io/tx/${signature}`);
}

// === Run ===
executeSwap().catch(console.error);
