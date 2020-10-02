require('dotenv').config()
const shortId = require('shortid')
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const moment = require('moment')
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

 //Start here
const Schema = mongoose.Schema;
const exerciseSchema = new Schema({
  description:{type: String, required: true},
  duration:{type: Number, required: true, min:[1, 'Duration too short']},
  date: {type:Date, default: Date.now},
  userId:{type:String, required:true}
})

const userSchema = new Schema({
  _id:{type: String, default: shortId.generate},
  username:{type: String, unique: true, required: true}
})

const User = mongoose.model('user', userSchema)
const Exercise = mongoose.model('exercise', exerciseSchema)


app.post('/api/exercise/new-user',async(req, res)=>{
  const {username} = req.body;
  User.findOne({
    username
  }).then(user=>{
    if(user) throw new Error('Username already taken')
    //Luu new username
    return User.create({username})
  }).then(user=>res.status(200).send({
    username: user.username,
    _id: user._id
  })).catch(err=>{
    console.log(err);
    res.status(500).send(err.message)
  })
})

app.post('/api/exercise/add', async (req, res)=>{
  let {userId, description, duration, date} = req.body;
  User.findOne({
    _id: userId
  }).then(user=>{
    if(!user) throw new Error('Unknown user with _id')
    // console.log(user.username)


    // Xu li truong hop date rong
    date=date||Date.now();

    return Exercise.create({
      description,
      duration,
      date,
      userId
    }).then(exercise=>res.status(200).send({
      _id: user._id,
      username: user.username,
      date: moment(exercise.date).format('ddd MMM DD YYYY'),
      duration: exercise.duration,
      description: exercise.description
    }))
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err.message)
  })
})

app.get('/api/exercise/users', (req, res)=>{
  User.find({}).then(allUser=>res.send(allUser))
})

app.get('/api/exercise/log', (req, res)=>{
  console.log(req.query)
  let {userId, from, to, limit} = req.query;
  from = moment(from, 'YYYY-MM-DD').isValid()?moment(from, 'YYYY-MM-DD'):0;
  to = moment(to, 'YYYY-MM-DD').isValid()?moment(to, 'YYYY-MM-DD'):moment().add(1, 'month');
  User.findById(userId).then(user=>{
    if(!user) throw new Error('Unknown user with _id');
    Exercise.find({userId}).where('date').gte(from).lte(to).limit(+limit).exec().then(log=>{
      // console.log(log)
      res.status(200).send({
        _id: userId,
        username: user.username,
        count: log.length,
        //Tra ve mot array
        log: log.map(exData=>({
          description: exData.description,
          duration: exData.duration,
          date: moment(exData.date).format('ddd MMM DDD YYYY')
        }))
      })
    })
  }).catch(err=>{
    console.log(err);
    res.status(500).send(err.message)
  })
})
//bind middleware vao tat ca path va tat ca method de xu li error
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
