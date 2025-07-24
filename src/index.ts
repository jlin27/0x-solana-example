import { config as dotenv } from "dotenv";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
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
      tokenIn: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      tokenOut: "So11111111111111111111111111111111111111112", // SOL
      amountIn: 10000, // .01 USDC
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

// === Step 3: Send the Transaction ===
async function executeSwap() {
  const quote = await getQuote();
  const instructions = buildInstructions(quote.instructions);

  const tx = new Transaction().add(...instructions);
  tx.feePayer = takerKeypair.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  tx.partialSign(takerKeypair);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });

  await connection.confirmTransaction(signature, "confirmed");
  console.log(`✅ Swap complete. https://solscan.io/tx/${signature}`);
}

// === Run ===
executeSwap().catch(console.error);
