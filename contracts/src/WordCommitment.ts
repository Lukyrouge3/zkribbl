import {
  Field,
  SmartContract,
  state,
  State,
  method,
  Poseidon,
  Bool,
  CircuitString
} from 'o1js';

export class WordCommitment extends SmartContract {
  @state(Field) wordHash = State<Field>();


  @method async initState(firstSecret: CircuitString) {
    this.wordHash.set(firstSecret.hash());
  }

  @method async verifyGuess(secret: CircuitString) {
    const wordHash = this.wordHash.get();
    this.wordHash.requireEquals(wordHash);

    secret.hash().assertEquals(wordHash);
  }
}