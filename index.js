import 'dotenv/config'
import { Client, Events, GatewayIntentBits, inlineCode } from 'discord.js'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import ms from 'ms'

const client = new Client({ intents: [GatewayIntentBits.GuildMessages] })
const db = await open({
  filename: 'BotDatabase.db',
  driver: sqlite3.Database,
  mode: sqlite3.OPEN_READONLY
})
const EventId = process.env.EVENT_ID
let channel
const messages = []

client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`)
  const guild = c.guilds.resolve(process.env.GUILD_ID)
  channel = await guild.channels.fetch(process.env.CHANNEL_ID)

  setInterval(check, ms(process.env.INTERVAL))
  console.log(`Running check every ${process.env.INTERVAL}`)
  check()
})

function check () {
  let embeds = []
  Promise.all([
    db.get(`SELECT Name FROM Events WHERE Old=0 AND EventId='${EventId}';`),
    db.all(
      `SELECT Name, LevelId FROM Songs WHERE Old=0 AND EventId='${EventId}';`
    ),
    db.all(
      `SELECT LevelId, Username, Score, FullCombo FROM Scores WHERE Old=0 AND EventId='${EventId}';`
    )
  ]).then(async (results) => {
    const eventName = results[0].Name
    const songs = results[1]
    const scores = results[2]

    const fields = songs.map((song) => {
      return {
        name: song.Name,
        value: scores
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
          .map((score) =>
            inlineCode(
              `${String(score.Score).padStart(8, ' ')} ${
                score.FullCombo ? 'FC' : '  '
              } ${score.Username}`
            )
          )
          .join('\n')
      }
    })
    embeds = embeds.concat(
      fields.map((field) => {
        return {
          fields: [field],
          color: Math.floor(Math.random() * 16777215),
          timestamp: new Date().toISOString(),
          footer: { text: 'Retrieved:' },
          title: eventName + ' Leaderboards'
        }
      })
    )
    if (messages.length) {
      for (let i = 0; i < embeds.length; i++) {
        messages[i].edit({ embeds: [embeds[i]] })
      }
    } else {
      for (let i = 0; i < embeds.length; i++) {
        messages[i] = await channel.send({ embeds: [embeds[i]] })
      }
    }
  })
}

client.login(process.env.BOT_TOKEN)
// check()
