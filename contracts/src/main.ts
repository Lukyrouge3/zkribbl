import { WordCommitment } from './WordCommitment.js';
import { GuessVerifier } from './GuessVerifier.js';
import { Field, CircuitString, Mina, PrivateKey, AccountUpdate } from 'o1js';

const useProof = false;
const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);

// Accounts
const deployerAccount = Local.testAccounts[0];
const deployerKey = deployerAccount.key;
const senderAccount = Local.testAccounts[1];
const senderKey = senderAccount.key;

// Generate random salt
const salt = Field.random();

// Create zkApp destination
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkAppInstance = new WordCommitment(zkAppAddress);

// Deploy zkApp with initial word
const deployTxn = await Mina.transaction(deployerAccount, async () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  await zkAppInstance.deploy();
  await zkAppInstance.initState(CircuitString.fromString("Apple"));
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

console.log("Contract deployed and initialized.");

// Get initial state
const num0 = zkAppInstance.wordHash.get();
console.log("State after init:", num0.toString());

// ----------------------------------------------------
// Verify guesses using GuessVerifier
const verifier = new GuessVerifier(zkAppInstance, zkAppPrivateKey);

// Correct guess
await verifier.verifyGuess(senderKey, "Apple");

// Incorrect guess
await verifier.verifyGuess(senderKey, "Banana");

// Get state after guesses
const num1 = zkAppInstance.wordHash.get();
console.log("State after guesses:", num1.toString());