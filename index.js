const winston = require('winston')
const cheerio = require('cheerio')
const request = require('request')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const TeleBot = require('telebot')

const token = '470996714:AAGwXcJV8-qVyY6nj4w1q7_taWZSi7nMv3M'
const passphrase = 'snoopdogg'
const interval = 1000

const logger = winston.createLogger({
  transports: [new winston.transports.File({ filename: 'prod.log' })]
})

let db = low(new FileSync('db.json'))
let bot = new TeleBot(token)

db.defaults({ users: [], last: '' }).write()

process.on('uncaughtException', (err) => {
  logger.error(err.toString())
  db.get('users').value().forEach((u) => bot.sendMessage(u.id, "Holy moly guacamole! Something went very wrong! You betta check out them logs. I'm outta here!").then(() => process.exit()).catch((e) => logger.error(err.toString())))
})

let queue = []

bot.on('/start', (msg) => {
  if (db.get('users').find({ id: msg.from.id }).value()) {
    msg.reply.text("You're already there, mon!")
  } else {
    queue.push(msg.from.id)
    msg.reply.text("A'ight, now gimme the passphrase!")
  }
})

bot.on('/stop', (msg) => {
  msg.reply.text("Woah, didn't see it coming! See ya, mon.")
  queue = queue.filter((id) => id !== msg.from.id)
  db.get('users').remove({ id: msg.from.id }).write()
})

bot.on('text', (msg) => {
  if (['/start', '/stop'].includes(msg.text)) return

  let user = msg.from.id

  if (queue.find((u) => u === user)) {
    if (msg.text === passphrase) {
      msg.reply.text("Welcome. bro! Now when there's a bong on sale you'll be the first to know.")
      queue = queue.filter((id) => id !== user)
      db.get('users').push({ id: user }).write()
    } else {
      msg.reply.text("Try harder, you'll get there eventually.")
    }
  } else if (db.get('users').find({ id: msg.from.id }).value()) {
    msg.reply.text("Chill out, dawg. I'll notify you when there's somthing worth looking into. Peace!")
  } else {
    msg.reply.text("Join da club first. Type /start to get baked.")
  }
})

setInterval(function(){
  request('http://www.spbbong.com/rabotaem_v_minus', (err, res, html) => {
    if (!err && res.statusCode == 200) {
      let $ = cheerio.load(html)
      $('.vminus .info2').each((i, elem) => {
        let deal = $(elem)
        let name = deal.find('.name').text()
        let description = deal.find('p').text()
      })
    } else {
      throw err
    }
  })
}, interval)

bot.start()
