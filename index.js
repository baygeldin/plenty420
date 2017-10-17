const winston = require('winston')
const cheerio = require('cheerio')
const needle = require('needle')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const TeleBot = require('telebot')

const home = 'http://www.spbbong.com'
const sale = `${home}/rabotaem_v_minus`
const token = '470996714:AAGwXcJV8-qVyY6nj4w1q7_taWZSi7nMv3M'
const passphrase = 'snoopdogg'
const interval = 10000

const logger = winston.createLogger({
  transports: [new winston.transports.File({ filename: 'prod.log' })]
})

let db = low(new FileSync('db.json'))
let bot = new TeleBot(token)

db.defaults({ users: [], last: '' }).write()

process.on('uncaughtException', (err) => {
  logger.error(err.toString())
  let text = "Holy moly guacamole! Something went very wrong! You betta check out them logs. I'm outta here!"
  db.get('users').value().forEach((u) => bot.sendMessage(u.id, text)
    .then(() => process.exit()).catch((e) =>  logger.error(err.toString())))
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
    if (msg.text === '/link') {
      msg.reply.text(`Here you go, pal: ${sale}`)
    } else {
      msg.reply.text("Chill out, dawg. I'll notify you when there's somthing worth looking into. Peace!")
    }
  } else {
    msg.reply.text("Join da club first. Type /start to get baked.")
  }
})

setInterval(function(){
  needle.get(sale, (err, res) => {
    if (!err && res.statusCode == 200) {
      let $ = cheerio.load(res.body)
      let deal = $('.vminus').first()
      let info = deal.find('.info2')
      let meta = deal.find('.actiondet')
      let name = info.find('.name').text()
      let description = info.find('p').text()
      let image = info.find('img').attr('src')
      let oldPrice = parseInt(meta.find('.oldpricediv').text(), 10)
      let newPrice = parseInt(meta.find('.pricediv').text(), 10)

      if (db.get('last').value() !== name) {
        let text = `${name} (${oldPrice}₽ - ${oldPrice - newPrice}₽ = ${newPrice}₽!):\n\n${description}`
        let caption = text.substring(0, 197) + '...'
        db.get('users').value().forEach((u) => {
          if (image) {
            bot.sendPhoto(u.id, `${home}${image}`, { caption })
          } else {
            bot.sendMessage(u.id, caption)
          }
        })
        db.set('last', name).write()
      }
    } else {
      throw err
    }
  })
}, interval)

bot.start()
