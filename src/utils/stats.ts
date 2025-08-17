import { ChartAxisData, Result, Stats, DiceStats } from '../types/interfaces'
import { emptyStats, emptyDiceStats } from '../constants'
import { takeLastMapped } from './index'

export const calculateAverage = (array: number[]) => {
  var total = 0
  var count = 0

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
export const computePercentFromMax = (
  averageScore: number,
  maxPossibleScore: number
) => {
  let result = Math.floor((averageScore / maxPossibleScore) * 100)
  return result
}

/*
/* Convert to percent array of numbers
*/
export const getPercent = (min: number, max: number) => (value: number) =>
  (100 * (value - min)) / (max - min)

/*
/* Get axis values as integer array
*/
export const getAxisValues = (arr: ChartAxisData[]) => {
  return arr.map((item) => item.value)
}

/*
/* Compile user stats object
*/
export const compileStats = (results: Result[]) => {
  const scores: number[] = []
  const schoolScores: number[] = []
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
      stats[name as keyof typeof stats] +=
        item.stats[name as keyof typeof stats]

    item.favDiceValues.forEach((value, index) => {
      const name = Object.keys(diceStats)[index]
      diceStats[name as keyof typeof diceStats] += value
    })
  })

  const compileLineChartAxisData = (data: number[], ids: string[]) => {
    return takeLastMapped(data, ids, 50)
  }

  const compileBarChartAxisData = (data: Stats | DiceStats) => {
    const axisData: ChartAxisData[] = []
    const values: number[] = []

    // get values into array
    for (const name in data) {
      values.push(data[name as keyof typeof data])
    }

    const sample = getPercent(0, Math.max(...values))

    for (const name in data) {
      axisData.push({
        id: name,
        value: Math.floor(sample(data[name as keyof typeof data])),
      })
    }
    return axisData
  }

  const average = Math.floor(calculateAverage(scores))
  const percentFromMax = computePercentFromMax(average, 879) // max score

  const userStats = {
    games: results.length,
    max: Math.max(...scores),
    average,
    percentFromMax,
    favDiceValues: compileBarChartAxisData(diceStats),
    favComb: compileBarChartAxisData(stats),
    schoolScores: compileLineChartAxisData(schoolScores, ids),
    scores: compileLineChartAxisData(scores, ids),
  }

  return userStats
}
