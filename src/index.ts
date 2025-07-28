import { config as dotenv } from "dotenv";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import fetch from "node-fetch";
import { fetchConfig } from "./config";
import {
  Instruction,
  InstructionAccount,
  ZeroExQuoteResponse,
  ZeroExQuoteResponseSchema,
} from "./schema";

// === Load ENV Variables ===
dotenv({ quiet: true });
const config = fetchConfig();

// === Step 1: Get a Quote ===
async function getQuote(): Promise<ZeroExQuoteResponse> {
  const response = await fetch(
    "https://staging.api.0x.org/solana/swap-instructions",
    {
      method: "POST",
      headers: {
        "0x-api-key": config.zeroexApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tokenOut: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        tokenIn: "So11111111111111111111111111111111111111112", // SOL
        amountIn: 1000000, // .001 SOL
        taker: config.keypairConfig.keypair.publicKey.toBase58(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch quote: ${response.statusText}`);
  }

  return ZeroExQuoteResponseSchema.parse(await response.json());
}

// === Step 2: Build Instructions ===
function decodePubkey(bytes: number[]): PublicKey {
  return new PublicKey(Uint8Array.from(bytes));
}

function buildInstructions(
  instructionsData: Instruction[]
): TransactionInstruction[] {
  return instructionsData.map((ix) => {
    const keys = ix.accounts.map((acc: InstructionAccount) => ({
      pubkey: decodePubkey(acc.pubkey),
      isSigner: acc.is_signer,
      isWritable: acc.is_writable,
    }));

    const programId = decodePubkey(ix.program_id);
    const data = Buffer.from(ix.data);

    return new TransactionInstruction({ keys, programId, data });
  });
}

// === Step 3: Execute Swap with Simulation and Confirmation ===
async function executeSwap() {
  try {
    const quote = await getQuote();
    console.log("💰 Quote received");

    if (!config.keypairConfig.isUserProvided) {
      console.log(
        "No private key provided. Please provide a private key to enable simulation and transaction sending."
      );
      return;
    }

    const instructions = buildInstructions(quote.instructions);
    const latestBlockhash = await config.connection.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
      payerKey: config.keypairConfig.keypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(messageV0);
    versionedTx.sign([config.keypairConfig.keypair]);

    // === Simulate Transaction ===
    const { value: simulationResult } =
      await config.connection.simulateTransaction(versionedTx, {
        sigVerify: true,
      });

    if (simulationResult.err) {
      console.error("❌ Simulation failed:", simulationResult.err);
      if (simulationResult.logs) {
        console.error("🪵 Logs:\n" + simulationResult.logs.join("\n"));
      }
      throw new Error("Aborting due to failed simulation.");
    } else {
      console.log("✅ Simulation succeeded");
    }

    // === Send Transaction ===
    const signature = await config.connection.sendTransaction(versionedTx, {
      skipPreflight: true,
    });

    console.log(`🖊️ Transaction sent with signature: ${signature}`);

    // === Confirm Transaction Status ===
    const confirmation = await config.connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "finalized"
    );

    if (confirmation.value.err) {
      console.error(
        `❌ Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    } else {
      console.log(
        `✅ Transaction confirmed: https://solscan.io/tx/${signature}`
      );
    }
  } catch (error) {
    console.error("Failed to process quote and swap:", error);
  }
}

// === Run ===
executeSwap().catch(console.error);
