import axios from 'axios';
import { WordCommitment } from './WordCommitment.js';
import { GuessVerifier } from './GuessVerifier.js';

import { Field, Mina, PrivateKey } from 'o1js';

// Setup Mina
const useProof = false;
const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);

// Accounts setup
const deployerAccount = Local.testAccounts[0];
const senderAccount = Local.testAccounts[1];
const senderKey = senderAccount.key;

// Generate random salt (same salt used by the deployer)
const salt = Field.random();

// Create zkApp destination
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkAppInstance = new WordCommitment(zkAppAddress);

// Create a verifier instance for making guesses
const verifier = new GuessVerifier(zkAppInstance, zkAppPrivateKey);

// Function to make guesses by sending POST requests to the server
async function makeGuess(guess: string) {
  try {
    const response = await axios.post('http://localhost:8080/verify-guess', {
      guess: guess
    });

    console.log('Response:', response.data);
  } catch (error: any) {
    console.error('Error verifying guess:', error.response ? error.response.data : error.message);
  }
}

// Now, we send some guesses (this can be an infinite loop, a series of guesses, etc.)
const guesses = ['Apple', 'Banana', 'Cherry'];  // Example guesses

for (const guess of guesses) {
  await makeGuess(guess);
  console.log(`Sent guess: ${guess}`);
}