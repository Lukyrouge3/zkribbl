import { WordCommitment } from './WordCommitment.js';
import { Field, CircuitString, Mina, PrivateKey, AccountUpdate, Poseidon } from 'o1js';

export class GuessVerifier {
  zkAppInstance: WordCommitment;
  salt: Field;
  zkAppPrivateKey: PrivateKey;
  zkAppAddress: Field;

  constructor(zkAppInstance: WordCommitment, salt: Field, zkAppPrivateKey: PrivateKey) {
    this.zkAppInstance = zkAppInstance;
    this.salt = salt;
    this.zkAppPrivateKey = zkAppPrivateKey;
  }

  // Utility function: Hash a string into a Field
  static hashString(str: string): Field {
    const charCodes = str.split('').map(c => c.charCodeAt(0)); // Convert string to numbers
    return Poseidon.hash(charCodes.map(n => new Field(n))); // Hash the numbers
  }

  // Verify a user's guess
  async verifyGuess(guesserAccount: PrivateKey, guess: string) {
    try {
      const txn = await Mina.transaction(guesserAccount.toPublicKey(), async () => {
        await this.zkAppInstance.verifyGuess(this.salt, CircuitString.fromString(guess));
      });

      await txn.prove();
      await txn.sign([guesserAccount]).send();
      console.log(`✅ Guess "${guess}" is correct!`);
    } catch (error: any) {
      console.log(`❌ Guess "${guess}" is incorrect.`);
    }
  }
}