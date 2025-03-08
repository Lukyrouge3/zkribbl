import { WordCommitment } from './WordCommitment.js';
import { Field, CircuitString, Mina, PrivateKey, AccountUpdate, Poseidon } from 'o1js';

export class GuessVerifier {
  zkAppInstance: WordCommitment;
  salt: Field;
  zkAppPrivateKey: PrivateKey;
  zkAppAddress: Field;

  constructor(zkAppInstance: WordCommitment, zkAppPrivateKey: PrivateKey) {
    this.zkAppInstance = zkAppInstance;
    this.zkAppPrivateKey = zkAppPrivateKey;
  }

  // Verify a user's guess
  async verifyGuess(guesserAccount: PrivateKey, guess: string) {
    try {
      const txn = await Mina.transaction(guesserAccount.toPublicKey(), async () => {
        await this.zkAppInstance.verifyGuess(CircuitString.fromString(guess));
      });

      await txn.prove();
      await txn.sign([guesserAccount]).send();
      console.log(`✅ Guess "${guess}" is correct!`);
    } catch (error: any) {
      console.log(`❌ Guess "${guess}" is incorrect.`);
    }
  }
}