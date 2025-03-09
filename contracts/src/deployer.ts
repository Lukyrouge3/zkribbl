import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { WordCommitment } from './WordCommitment.js';
import { GuessVerifier } from './GuessVerifier.js';
import { Field, CircuitString, Mina, PrivateKey, AccountUpdate } from 'o1js';

// Setup express app
const app = express();
const port = 8080;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Start local blockchain
const useProof = false;
const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);

// Accounts
const deployerAccount = Local.testAccounts[0];
const deployerKey = deployerAccount.key;
const senderAccount = Local.testAccounts[1];

// Generate random salt
const salt = Field.random();

// Create zkApp destination (zkApp address and private key)
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkAppInstance = new WordCommitment(zkAppAddress);

// Deploy zkApp and initialize it with a word hash (e.g., "Apple")
const deployTxn = await Mina.transaction(deployerAccount, async () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  await zkAppInstance.deploy();
  await zkAppInstance.initState(CircuitString.fromString("Apple"));
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

console.log("Contract deployed and initialized.");

// REST endpoint to verify a guess
app.post('/verify-guess', async (req: Request, res: any) => {
  const { guess } = req.body;

  if (!guess) {
    return res.status(400).json({ error: "No guess provided" });
  }

  try {
    // Use GuessVerifier to check the guess
    const verifier = new GuessVerifier(zkAppInstance, zkAppPrivateKey);

    // Verify the guess
    await verifier.verifyGuess(senderAccount.key, guess);

    console.log(`✅ Guess "${guess}" is correct!`);

    return res.status(200).json({ message: `✅ Guess "${guess}" is correct!`});
  } catch (error) {
    console.log(`❌ Guess "${guess}" is incorrect.`);
    return res.status(400).json({ message: `❌ Guess "${guess}" is incorrect.`});
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});