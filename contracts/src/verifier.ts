import { GameCommitment, GameState } from './smartContract.js';
import {
  Field,
  CircuitString,
  Mina,
  PrivateKey,
  AccountUpdate,
  Poseidon,
} from 'o1js';

export class Verifier {
  zkAppInstance: GameCommitment;
  salt: Field;
  zkAppPrivateKey: PrivateKey;
  zkAppAddress: Field;

  constructor(zkAppInstance: GameCommitment, zkAppPrivateKey: PrivateKey) {
    this.zkAppInstance = zkAppInstance;
    this.zkAppPrivateKey = zkAppPrivateKey;
  }

  // Verify a user's guess
  async verifyGuess(
    guesserAccount: PrivateKey,
    guess: string,
    gameState: GameState
  ) {
    const txn = await Mina.transaction(
      guesserAccount.toPublicKey(),
      async () => {
        await this.zkAppInstance.verifyGuess(
          CircuitString.fromString(guess),
          guesserAccount.toPublicKey(),
          gameState
        );
      }
    );

    await txn.prove();
    await txn.sign([guesserAccount]).send();
  }

  async verifyGame(guesserAccount: PrivateKey, gameState: GameState) {
    const txn = await Mina.transaction(
      guesserAccount.toPublicKey(),
      async () => {
        await this.zkAppInstance.verifyGameHash(gameState);
      }
    );

    await txn.prove();
    await txn.sign([guesserAccount]).send();
  }
}
