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
import { Server } from 'socket.io';
import cors from 'cors';

// Setup express app
const app = express();
app.use(cors());
const server = http.createServer(app);
const port = 8080;

// Middleware to parse JSON bodies
app.use(express.json());

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
    await verifier.verifyGuess(senderAccount.key, guess, gameState);

    console.log(`✅ Guess "${guess}" is correct!`);

    return res.status(200).json({ message: `✅ Guess "${guess}" is correct!` });
  } catch (error) {
    console.log(`❌ Guess "${guess}" is incorrect.`);
    return res
      .status(400)
      .json({ message: `❌ Guess "${guess}" is incorrect.` });
  }
});

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  // console.log(`socket ${socket.id} connected`);

  socket.on('disconnect', (reason) => {
    // console.log(`socket ${socket.id} disconnected due to ${reason}`);
  });

  socket.on('drawing', (message) => {
    // Send the data to all other clients
    socket.broadcast.emit('drawing', message);
  });

  socket.on('updateGameState', (gs) => {
    socket.broadcast.emit('updateGameState', gs);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
