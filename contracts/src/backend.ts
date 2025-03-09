import express, { Request, Response } from 'express';
//@ts-ignore
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

// Create zkApp destination (zkApp address and private key)
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkAppInstance = new WordCommitment(zkAppAddress);

app.post('/deploy', async (req: Request, res: any) => {
  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: 'No word provided' });
  }

  try {
    const deployTxn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkAppInstance.deploy();
      await zkAppInstance.initState(CircuitString.fromString(word));
    });
    await deployTxn.prove();
    await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

    res.status(200).json({ message: 'Contract deployed and initialized.' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to deploy contract' });
  }
});

// REST endpoint to verify a guess
app.post('/verify-guess', async (req: Request, res: any) => {
  const { guess } = req.body;

  if (!guess) {
    return res.status(400).json({ error: 'No guess provided' });
  }

  try {
    // Use GuessVerifier to check the guess
    const verifier = new GuessVerifier(zkAppInstance, zkAppPrivateKey);

    // Verify the guess
    await verifier.verifyGuess(senderAccount.key, guess);

    console.log(`✅ Guess "${guess}" is correct!`);

    return res.status(200).json({ message: `✅ Guess "${guess}" is correct!` });
  } catch (error) {
    console.log(`❌ Guess "${guess}" is incorrect.`);
    return res
      .status(400)
      .json({ message: `❌ Guess "${guess}" is incorrect.` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
