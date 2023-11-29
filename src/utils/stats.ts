import { ChartAxisData } from '../types/interfaces'

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
