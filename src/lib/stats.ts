import fs from 'fs';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'stats.json');

interface StatsData {
    scores: number[];
}

function getStats(): StatsData {
    try {
        if (!fs.existsSync(STATS_FILE)) {
            // Seed with 1000 realistic scores for a "cold start"
            const seedScores = Array.from({ length: 1000 }, () => {
                const rand = Math.random();
                if (rand > 0.8) return Math.floor(Math.random() * 20) + 80; // 80-100
                if (rand > 0.4) return Math.floor(Math.random() * 30) + 50; // 50-80
                return Math.floor(Math.random() * 50); // 0-50
            });
            const data = { scores: seedScores };
            fs.writeFileSync(STATS_FILE, JSON.stringify(data));
            return data;
        }
        return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    } catch (e) {
        return { scores: [] };
    }
}

export function recordScore(score: number) {
    const data = getStats();
    data.scores.push(score);
    // Keep file size reasonable for this demo
    if (data.scores.length > 5000) data.scores.shift();

    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save stats:', e);
    }

    const count = data.scores.length;
    const lowerScores = data.scores.filter(s => s < score).length;
    const sameScores = data.scores.filter(s => s === score).length;

    // Percentile = (Number of scores below + 0.5 * Number of scores equal) / total
    const percentile = ((lowerScores + (0.5 * sameScores)) / count) * 100;

    return {
        totalScans: count + 12450, // Add a "historic" offset to make it look like a large app
        percentile: Math.round(percentile)
    };
}
