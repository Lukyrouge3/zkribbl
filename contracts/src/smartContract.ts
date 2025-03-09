import {
  Field,
  SmartContract,
  state,
  State,
  method,
  Poseidon,
  Bool,
  CircuitString,
  Struct,
  PublicKey,
} from 'o1js';

const MAX_PLAYERS = 10;

export class GameState extends Struct({
  scores: [PublicKey, MAX_PLAYERS],
  ownerKey: PublicKey,
  playerWhoGuessedCount: Field,
  gameEnded: Bool,
}) {}

export class GameCommitment extends SmartContract {
  @state(Field) wordHash = State<Field>();
  @state(Field) gameStateHash = State<Field>();

  @method async initState(word: CircuitString) {
    this.wordHash.set(word.hash()); // TODO: add salt
  }

  @method async verifyGuess(guess: CircuitString, currentGameState: GameState) {
    const wordHash = this.wordHash.get();
    this.wordHash.requireEquals(wordHash);

    guess.hash().assertEquals(wordHash);
  }
}
