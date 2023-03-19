import 'dotenv/config'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import excelJS from 'exceljs'

const db = await open({
  filename: 'BotDatabase.db',
  driver: sqlite3.Database,
  mode: sqlite3.OPEN_READONLY
})
const EventId = process.env.EVENT_ID

Promise.all([
  db.get(`SELECT Name FROM Events WHERE EventId='${EventId}';`),
  db.all(
    `SELECT Name, LevelId FROM Songs WHERE Old=0 AND EventId='${EventId}';`
  ),
  db.all(
    `SELECT LevelId, Username, Score, FullCombo FROM Scores WHERE EventId='${EventId}';`
  )
]).then(async (results) => {
  const eventName = results[0].Name
  const songs = results[1]
  const scores = results[2]

  // eslint-disable-next-line no-useless-escape
  const re = /[*?:\\\/[\]]|^'|'$/g

  const workbook = new excelJS.Workbook(eventName)
  songs.forEach((song) => {
    const worksheet = workbook.addWorksheet(song.Name.replaceAll(re, ''))

    worksheet.columns = [{ key: 'score' }, { key: 'fc' }, { key: 'user' }]

    scores
      .filter((score) => score.LevelId === song.LevelId)
      .sort((a, b) => {
        if (a.Score > b.Score) {
          return -1
        }
        if (a.Score < b.Score) {
          return 1
        }
        return 0
      })
      .filter(
        (elem, pos, arr) =>
          arr.findIndex((score) => score.Username === elem.Username) === pos
      )
      .forEach((score) =>
        worksheet.addRow({
          user: score.Username,
          score: score.Score,
          fc: score.FullCombo
        })
      )
  })

  await workbook.xlsx.writeFile('export.xlsx')
})
