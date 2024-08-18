<template>
  <div class="stats-history">
    <h2>Match History & Stats</h2>

    <div class="stats">
      <div class="stat">
        <h3>Total Wins</h3>
        <p>{{ stats.totalWins }}</p>
      </div>
      <div class="stat">
        <h3>Total Losses</h3>
        <p>{{ stats.totalLosses }}</p>
      </div>
      <div class="stat">
        <h3>Winning Percentage</h3>
        <p>{{ winningPercentage }}%</p>
      </div>
    </div>

    <div class="history">
      <h3>Match History</h3>
      <ul>
        <li v-for="match in matchHistory" :key="match.id">
          {{ match.date }} - {{ match.opponent }} - {{ match.result }}
        </li>
      </ul>
    </div>
  </div>
</template>
  
  <script>
  export default {
    data() {
      return {
        stats: {
          totalWins: 10,
          totalLosses: 5,
        },
        matchHistory: [
          { id: 1, date: '2023-08-15', opponent: 'John Doe', result: 'Win' },
          { id: 2, date: '2023-08-14', opponent: 'Jane Smith', result: 'Loss' },
          // Add more match data here
        ],
      };
    },
    computed: {
      winningPercentage() {
        const totalGames = this.stats.totalWins + this.stats.totalLosses;
        return totalGames ? ((this.stats.totalWins / totalGames) * 100).toFixed(2) : 0;
      },
    },
  };
  </script>
  
<style scoped>
.stats-history {
  padding: 20px;
}

h2, h3 {
  text-align: center;
}

.stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
}

.stat {
  text-align: center;
}

.history ul {
  list-style: none;
  padding: 0;
}

.history li {
  background-color: #2c3e50;
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 5px;
}
</style>
  