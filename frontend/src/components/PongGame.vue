<template>
	<div class="game-container">
	<div class="paddle left-paddle"></div>
	<div class="paddle right-paddle"></div>
	<div class="ball"></div>
	</div>
</template>

<script>
export default {
	name: 'PongGame',
	data() {
	return {};
	},
};
</script>

<style scoped>
.game-container {
	width: 600px;
	height: 400px;
	border: 1px solid #000;
	position: relative;
	margin: 0 auto;
}

.paddle {
	width: 10px;
	height: 60px;
	background: #000;
	position: absolute;
}

.left-paddle {
	left: 0;
	top: 50%;
	transform: translateY(-50%);
}

.right-paddle {
	right: 0;
	top: 50%;
	transform: translateY(-50%);
}

.ball {
	width: 10px;
	height: 10px;
	background: #f00;
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	border-radius: 50%;
}
</style>
