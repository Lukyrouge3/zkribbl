import express, { Request, Response } from 'express';
import http from 'http';
import { GameCommitment, GameState, MAX_PLAYERS } from './smartContract.js';
import { Verifier } from './verifier.js';
import {
  Field,
  CircuitString,
  Mina,
  PrivateKey,
  AccountUpdate,
  PublicKey,
  Bool,
} from 'o1js';
import cors from 'cors';
import { Server } from 'socket.io';

// Setup express app
const app = express();
const server = http.createServer(app);
const port = 8080;
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  allowEIO3: true, // false by default
});

// Middleware to parse JSON bodies
app.use('/deploy', express.json());
app.use('/verify-guess', express.json());
app.use('/verify-gamestate', express.json());

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
const zkAppInstance = new GameCommitment(zkAppAddress);

let gs: GameState;
app.post('/deploy', async (req: Request, res: any) => {
  const { word } = req.body;
  console.log(req.body);
  if (!word) {
    return res.status(400).json({ error: 'No word provided' });
  }

  try {
    const gameState = new GameState({
      scores: Array(MAX_PLAYERS).fill(PublicKey.empty()),
      ownerKey: PublicKey.empty(),
      playerWhoGuessedCount: Field(0),
      gameEnded: Bool(false),
    });
    gs = gameState;
    const deployTxn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkAppInstance.deploy();
      await zkAppInstance.initState(CircuitString.fromString(word), gameState);
    });
    await deployTxn.prove();
    await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

    res
      .status(200)
      .json({ message: 'Contract deployed and initialized.', gameState });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to deploy contract' });
  }
});

app.post('/verify-gamestate', async (req: Request, res: any) => {
  const { gameState } = req.body;

  // if (!gameState) {
  //   return res.status(400).json({ error: 'No game state provided' });
  // }

  try {
    // Use GuessVerifier to check the guess
    const verifier = new Verifier(zkAppInstance, zkAppPrivateKey);

    // Verify the guess
    await verifier.verifyGame(senderAccount.key, gs);

    console.log('✅ Game state is correct!');

    return res.status(200).json({ message: '✅ Game state is correct!' });
  } catch (error) {
    console.log('❌ Game state is incorrect.');
    return res.status(400).json({ message: '❌ Game state is incorrect.' });
  }
});

// REST endpoint to verify a guess
app.post('/verify-guess', async (req: Request, res: any) => {
  const { guess, gameState } = req.body;

  if (!guess) {
    return res.status(400).json({ error: 'No guess provided' });
  }

  try {
    // Use GuessVerifier to check the guess
    const verifier = new Verifier(zkAppInstance, zkAppPrivateKey);

    // Verify the guess
    await verifier.verifyGuess(senderAccount.key, guess, gs);

    console.log(`✅ Guess "${guess}" is correct!`);

    return res.status(200).json({ message: `✅ Guess "${guess}" is correct!` });
  } catch (error) {
    console.log(`❌ Guess "${guess}" is incorrect.`);
    return res
      .status(400)
      .json({ message: `❌ Guess "${guess}" is incorrect.` });
  }
});

io.on('connection', (socket: any) => {
  // console.log(`socket ${socket.id} connected`);

  socket.on('disconnect', (reason: any) => {
    // console.log(`socket ${socket.id} disconnected due to ${reason}`);
  });

  socket.on('drawing', (message: any) => {
    // Send the data to all other clients
    socket.broadcast.emit('drawing', message);
  });

  socket.on('updateGameState', (gs: any) => {
    socket.broadcast.emit('updateGameState', gs);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
