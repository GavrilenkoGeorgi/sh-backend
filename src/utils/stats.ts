import { ChartAxisData, Result, Stats, DiceStats } from '../types/interfaces'
import { emptyStats, emptyDiceStats } from '../constants'

export const calculateAverage = (array: number[]) => {
  var total = 0;
  var count = 0;

  array.forEach((item) => {
      total += item
      count++
  })

  return total / count
}

/*
/* @param {integer} averageScore     Average user score
/* @param {integer} maxPossibleScore Max possible score in game
/* @return {integer}                 User percent from max
/*                                   possible score
*/
export const computePercentFromMax = (averageScore: number, maxPossibleScore: number) => {
  let result = Math.floor(averageScore / maxPossibleScore * 100)
  return result
}

/*
/* Convert to percent array of numbers
*/
export const getPercent = (min: number, max: number) => (value: number) => 100 * (value - min) / (max - min)

/*
/* Get axis values as integer array
*/
export const getAxisValues = (arr: ChartAxisData[]) => {
  return arr.map(item => item.value)
}

/*
/* Compile user stats object
*/
export const compileStats = (results: Result[]) => {

  const scores: number[] = []
  const schoolScores: number[] = []
  let favComb: ChartAxisData[] = []
  let favDiceValues: ChartAxisData[] = []
  let stats = emptyStats
  let diceStats = emptyDiceStats
  let ids: string[] = []

  // init
  for (const name in stats) stats[name as keyof typeof stats] = 0
  for (const name in diceStats) diceStats[name as keyof typeof diceStats] = 0

  // prepare data
  results.forEach((item) => {
    ids.push(item._id.getTimestamp())
    scores.push(item.score)
    schoolScores.push(item.schoolScore)

    for (const name in stats)
      stats[name as keyof typeof stats] += item.stats[name as keyof typeof stats]

    item.favDiceValues.forEach((value, index) => {
      const name = Object.keys(diceStats)[index]
      diceStats[name as keyof typeof diceStats] += value
    })

  })

  const compileBarChartAxisData = (arr: ChartAxisData[], data: Stats | DiceStats) => {
    for (const name in data) {
      arr.push({
        id: name,
        value: data[name as keyof typeof data]
      })
    }
    return arr
  }

  const compileLineChartAxisData = (data: number[], ids: string[]) => {
    return data.slice(0, 50).map((score: number, idx: number) => ({
      id: ids[idx],
      value: score
    }))
  }

  const average = Math.floor(calculateAverage(scores))
  const percentFromMax = computePercentFromMax(average, 879) // max score

  const diceValuePercent = getAxisValues(favDiceValues)
    .map(getPercent(0, Math.max(...getAxisValues(favDiceValues))))
  const combinationsPercent = getAxisValues(favComb)
    .map(getPercent(0, Math.max(...getAxisValues(favComb))))

  compileBarChartAxisData(favComb, stats)
    .map((item, idx) => ({ ...item, value: Math.floor(combinationsPercent[idx]) }))
  compileBarChartAxisData(favDiceValues, diceStats)
    .map((item, idx) => ({ ...item, value: Math.floor(diceValuePercent[idx]) }))

  const userStats = {
    games: results.length,
    max: Math.max(...scores),
    average,
    percentFromMax,
    favDiceValues,
    favComb,
    schoolScores: compileLineChartAxisData(schoolScores, ids),
    scores: compileLineChartAxisData(scores, ids)
  }

  return userStats
}
