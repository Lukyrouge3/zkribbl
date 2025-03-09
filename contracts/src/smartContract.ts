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

export const MAX_PLAYERS = 10;

export class GameState extends Struct({
  scores: [PublicKey, MAX_PLAYERS],
  ownerKey: PublicKey,
  playerWhoGuessedCount: Field,
  gameEnded: Bool,
}) {
  toFields(): Field[] {
    // Serialize the scores array (PublicKey[])
    const scoresFields = this.scores.flatMap((score) => score.toFields());

    // Serialize the rest of the fields
    return [
      ...scoresFields, // Flattened scores array
      ...this.ownerKey.toFields(), // Serialize ownerKey (PublicKey)
      this.playerWhoGuessedCount, // playerWhoGuessedCount is already a Field
      Bool.toField(this.gameEnded), // Convert Bool to Field
    ];
  }

  hash(): Field {
    // Hash the struct
    const fields = this.toFields();
    return Poseidon.hash(fields);
  }

  incrementScore(key: PublicKey) {
    this.gameEnded.assertTrue('Game is already ended');

    this.playerWhoGuessedCount.assertLessThan(
      Field(MAX_PLAYERS),
      'Maximum number of players reached.'
    );

    // Create a new scores array with the updated player key
    const newScores = this.scores.slice(); // Copy the existing scores array
    newScores[Number(this.playerWhoGuessedCount.toBigInt())] = key; // Update the score

    // Increment the playerWhoGuessedCount
    const newPlayerWhoGuessedCount = this.playerWhoGuessedCount.add(Field(1));

    // Return a new GameState instance with the updated values
    return new GameState({
      scores: newScores,
      ownerKey: this.ownerKey,
      playerWhoGuessedCount: newPlayerWhoGuessedCount,
      gameEnded: this.gameEnded,
    });
  }
}

export class GameCommitment extends SmartContract {
  @state(Field) wordHash = State<Field>();
  @state(Field) gameStateHash = State<Field>();

  @method async initState(word: CircuitString, gs: GameState) {
    this.wordHash.set(word.hash()); // TODO: add salt
    this.gameStateHash.set(gs.hash());
  }

  @method async verifyGuess(
    guess: CircuitString,
    guesserKey: PublicKey,
    gameState: GameState
  ) {
    // Step 1: Verify the integrity of the gameState
    const currentGameStateHash = this.gameStateHash.get();
    this.gameStateHash.requireEquals(currentGameStateHash);

    const computedGameStateHash = gameState.hash();
    computedGameStateHash.assertEquals(
      currentGameStateHash,
      'Invalid game state.'
    );

    // Step 2: Check if the game has ended
    gameState.gameEnded.assertFalse('The game has already ended.');

    // Step 3: Check the guess
    const wordHash = this.wordHash.get();
    this.wordHash.requireEquals(wordHash);

    guess.hash().assertEquals(wordHash);

    const newGS = gameState.incrementScore(guesserKey);
    const newGSHash = gameState.hash();

    this.gameStateHash.set(newGSHash);
  }

  @method async verifyGameHash(gameState: GameState) {
    const currentGameStateHash = this.gameStateHash.get();
    this.gameStateHash.requireEquals(currentGameStateHash);

    const computedGameStateHash = gameState.hash();
    computedGameStateHash.assertEquals(
      currentGameStateHash,
      'Invalid game state.'
    );
  }
}
