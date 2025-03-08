// import { WordCommitment } from './WordCommitment.js';
// import { GuessVerifier } from './GuessVerifier.js';
// import { Field, Mina, PrivateKey, AccountUpdate } from 'o1js';

// class ZkribblGame {
//   // Constructor: Set initial state and the hash of the word
//   constructor(zkAppAddress, salt, wordHash) {
//     this.zkAppAddress = zkAppAddress;
//     this.salt = salt;
//     this.wordHash = wordHash;
//     this.guesses = {}; // Track guesses for each player
//   }

//   // Initialize the game with the first word
//   async initGame(salt, wordHash) {
//     this.wordHash = wordHash;
//     // Initialize player guesses
//     this.guesses = {};
//   }

//   // Function to verify a guess and update the game state
//   async verifyGuess(senderKey, guess) {
//     const guessHash = GuessVerifier.hashString(guess);
//     let result = false;

//     // If the guess matches the wordHash, mark it as correct
//     if (guessHash.equals(this.wordHash)) {
//       result = true;
//       console.log("Correct guess!");
//     } else {
//       console.log("Incorrect guess!");
//     }

//     // Update the guesses state
//     this.guesses[senderKey.toString()] = result;
//     return result;
//   }

//   // Fetch the current game state (wordHash and guesses)
//   getGameState() {
//     return {
//       wordHash: this.wordHash.toString(),
//       guesses: this.guesses
//     };
//   }
// }