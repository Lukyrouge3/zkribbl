<script lang="ts">
	import { onMount } from 'svelte';
	import { io, Socket } from 'socket.io-client';
	let canvas: HTMLCanvasElement | undefined = $state();
	const colors = [
		'#000000',
		'#FF0000',
		'#00FF00',
		'#0000FF',
		'#FFFF00',
		'#FF00FF',
		'#00FFFF',
		'#FFFFFF'
	];
	let sizes = [1, 2, 5, 10, 20];
	let colorIndex = $state(0);
	let sizeIndex = $state(2);
	let guesses = $state<string[]>([]);
	let guess = $state('');
	let guessed = $state(false);
	let guessing = $state(false);

	let socket: Socket;

	onMount(() => {
		if (!canvas) return;
		if (!socket) socket = io('http://localhost:3001');

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let isDrawing = false;
		let lastX = 0;
		let lastY = 0;

		canvas.addEventListener('mousedown', (e) => {
			isDrawing = true;
			[lastX, lastY] = [e.offsetX, e.offsetY];
		});

		canvas.addEventListener('mousemove', (e) => {
			if (!isDrawing) return;

			ctx.strokeStyle = colors[colorIndex];
			ctx.lineWidth = sizes[sizeIndex];
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';

			ctx.beginPath();
			ctx.moveTo(lastX, lastY);
			ctx.lineTo(e.offsetX, e.offsetY);
			ctx.stroke();

			[lastX, lastY] = [e.offsetX, e.offsetY];
			socket.emit('drawing', canvas!.toDataURL());
			console.log('emitted');
		});

		canvas.addEventListener('mouseup', () => (isDrawing = false));
		canvas.addEventListener('mouseout', () => (isDrawing = false));

		// Send the drawing to the server
		socket.on('drawing', (data: string) => {
			const img = new Image();
			img.onload = () => ctx.drawImage(img, 0, 0);
			img.src = data;
		});

		socket.on('guess', (g: string, valid: boolean) => {
			guessed = valid;
			guesses = [...guesses, guess];
			guess = '';

			guessing = false;
		});

		socket.on('error', (err: string) => {
			console.error(err);
		});
	});

	function clear() {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		socket.emit('drawing', canvas.toDataURL());
	}

	async function tryGuess(e: Event) {
		e.preventDefault();
		if (!guess || guessed || guessing) return;
		guessing = true;

		guess = guess.trim().toLowerCase();

		// Send guess to server
		socket.emit('guess', guess);
	}
</script>

<svelte:head>
	<title>ZKribbl</title>
</svelte:head>

<div class="flex flex-row">
	<div>
		<canvas width="600" height="600" bind:this={canvas} class="border border-gray-700"></canvas>
		<div class="h-10">
			{#each colors as color, i}
				<button
					onclick={() => (colorIndex = i)}
					class="h-8 w-8 text-transparent transition-all duration-200 hover:size-10 {colorIndex ===
					i
						? 'h-10 w-10 border-2'
						: ''}"
					style="background-color: {color}">.</button
				>
			{/each}
		</div>
		<div class="h-10">
			{#each sizes as size, i}
				<button
					onclick={() => (sizeIndex = i)}
					class="mx-1 h-8 w-8 border-collapse border transition-all duration-200 hover:size-10 {sizeIndex ===
					i
						? 'border-2'
						: ''}"
				>
					{size}
				</button>
			{/each}
		</div>
		<button onclick={clear}>Clear</button>
	</div>
	<div>
		<div class="flex flex-col">
			{#each guesses as g, i}
				<span class={guessed && guesses.length - 1 == i ? 'text-green-500' : 'text-red-500'}>
					{g}
				</span>
			{/each}
		</div>
		<form onsubmit={tryGuess}>
			<input type="text" bind:value={guess} placeholder="Guess..." disabled={guessed || guessing} />
			<button type="submit" disabled={guessed || guessing}>Guess</button>
		</form>
	</div>
</div>
